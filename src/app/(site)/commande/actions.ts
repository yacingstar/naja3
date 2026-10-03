"use server";

import { after } from "next/server";

import { sendPurchaseEvent } from "@/lib/meta/capi";
import { notifyNewOrder } from "@/lib/notify/telegram";
import { notifyNewOrderOnWhatsApp } from "@/lib/notify/whatsapp";
import { analyserTelephone, decouperNom } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlaceOrderInput = {
  // Un seul champ côté cliente. Le découpage en prénom / nom se fait ici, et
  // pas dans le formulaire : c'est une règle sur la DONNÉE, la base garde deux
  // colonnes, et deux découpages différents selon l'écran finiraient par ne
  // plus raconter la même chose.
  nomComplet: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryMethod: "domicile" | "stopdesk";
  note: string;
  items: Array<{ productId: number; colorId: number; quantity: number }>;
};

export type OrderSummary = {
  id: number;
  wilaya: string;
  commune: string;
  deliveryMethod: "domicile" | "stopdesk";
  deliveryFee: number;
  productsTotal: number;
  orderTotal: number;
  items: Array<{
    productName: string;
    // Carried through purely so the Purchase pixel event can report the
    // same content_ids that ViewContent and AddToCart use. Meta matches
    // those against a product catalogue, so slug-here / name-there would
    // look like two different products to it.
    productSlug: string;
    colorName: string;
    quantity: number;
    priceAtOrder: number;
  }>;
};

export type PlaceOrderResult =
  | { ok: true; order: OrderSummary }
  | { ok: false; error: string };

// The single write path for orders (see CONTEXT.md's Phase 1 write-path
// decision): nothing about price or availability is trusted from the
// client. Every line is re-fetched and re-priced from the live catalogue
// before anything is written, using the service-role client — the only
// role with INSERT on orders/order_items.
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  // Le nom complet est redécoupé ici, et le téléphone validé ici : le
  // formulaire fait les mêmes vérifications pour afficher une erreur sous le
  // champ, mais c'est une commodité, jamais la garantie. Une requête peut
  // arriver sans être passée par le formulaire.
  const { firstName, lastName } = decouperNom(input.nomComplet);
  const phone = input.phone.trim();
  const commune = input.commune.trim();
  const note = input.note.trim();

  // Le nom de famille peut être vide : une cliente qui n'écrit qu'un mot doit
  // pouvoir commander (voir decouperNom). La colonne est `not null`, pas
  // « non vide ».
  if (!firstName || !commune) {
    return { ok: false, error: "Merci de remplir tous les champs obligatoires." };
  }

  const telephone = analyserTelephone(phone);
  if (!telephone.ok) {
    return { ok: false, error: telephone.erreur };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "Votre panier est vide." };
  }

  const supabase = createAdminClient();

  const { data: rate } = await supabase
    .from("delivery_rates")
    .select("wilaya, domicile_price, stopdesk_price")
    .eq("wilaya", input.wilaya)
    .maybeSingle();

  if (!rate) return { ok: false, error: "Wilaya invalide." };

  const deliveryFee =
    input.deliveryMethod === "domicile" ? rate.domicile_price : rate.stopdesk_price;

  if (deliveryFee == null) {
    return { ok: false, error: "Le stopdesk n'est pas disponible pour cette wilaya." };
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const colorIds = [...new Set(input.items.map((i) => i.colorId))];

  const [{ data: products }, { data: colors }] = await Promise.all([
    supabase.from("products").select("id, slug, name, price").in("id", productIds),
    supabase
      .from("product_colors")
      .select("id, product_id, color_name, in_stock")
      .in("id", colorIds),
  ]);

  const orderItems: Array<{
    product_id: number;
    product_color_id: number;
    quantity: number;
    price_at_order: number;
    productName: string;
    productSlug: string;
    colorName: string;
  }> = [];

  for (const item of input.items) {
    if (item.quantity < 1) {
      return { ok: false, error: "Quantité invalide." };
    }

    const product = products?.find((p) => p.id === item.productId);
    const color = colors?.find((c) => c.id === item.colorId);

    if (!product || !color || color.product_id !== product.id) {
      return { ok: false, error: "Un des articles de votre panier n'existe plus." };
    }
    if (!color.in_stock) {
      return {
        ok: false,
        error: `La couleur "${color.color_name}" n'est plus disponible pour "${product.name}".`,
      };
    }

    orderItems.push({
      product_id: product.id,
      product_color_id: color.id,
      quantity: item.quantity,
      price_at_order: product.price,
      productName: product.name,
      productSlug: product.slug,
      colorName: color.color_name,
    });
  }

  const productsTotal = orderItems.reduce(
    (sum, item) => sum + item.price_at_order * item.quantity,
    0,
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_first_name: firstName,
      customer_last_name: lastName,
      phone,
      wilaya: input.wilaya,
      commune,
      delivery_method: input.deliveryMethod,
      delivery_fee: deliveryFee,
      products_total: productsTotal,
      notes_client: note || null,
    })
    .select("id, order_total")
    .single();

  if (orderError || !order) {
    return { ok: false, error: "Une erreur est survenue, merci de réessayer." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_color_id: item.product_color_id,
      quantity: item.quantity,
      price_at_order: item.price_at_order,
    })),
  );

  if (itemsError) {
    // Line items failed after the order row was created — don't leave an
    // order with no items behind.
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Une erreur est survenue, merci de réessayer." };
  }

  // Built once and handed to both channels. They share one payload type (see
  // notify/order.ts), so a second literal here would be a second chance for the
  // two messages to disagree about the same order.
  const notification = {
    orderId: order.id,
    firstName,
    lastName,
    phone,
    wilaya: input.wilaya,
    commune,
    deliveryMethod: input.deliveryMethod,
    note,
    deliveryFee,
    productsTotal,
    orderTotal: order.order_total,
    items: orderItems.map((item) => ({
      productName: item.productName,
      colorName: item.colorName,
      quantity: item.quantity,
      price_at_order: item.price_at_order,
    })),
  };

  // The side effects of a completed sale, after it is safely in the database
  // and only on the success path — an abandoned or rejected order must never
  // be reported to Meta or announced to the owner. `after` runs them once the
  // response has already gone out, so the customer reaches the confirmation
  // page without waiting on any of them; request APIs (cookies/headers) are
  // still readable inside the callback because this is a Server Function. See
  // next/dist/docs .../functions/after.md.
  //
  // One callback running all three concurrently, rather than three `after`
  // calls: the docs say `after` runs within the route's max duration, which on
  // Netlify defaults to 10s, and sequential 8s timeouts would sit far past that
  // edge. `Promise.all` is safe here because none of these functions ever
  // rejects — each swallows its own failures by contract. Telegram and WhatsApp
  // are two independent channels on purpose: whichever one breaks, the order
  // still reaches the owner on the other.
  after(async () => {
    await Promise.all([
      sendPurchaseEvent({
        orderId: order.id,
        orderTotal: order.order_total,
        firstName,
        lastName,
        phone,
        wilaya: input.wilaya,
        commune,
        items: orderItems.map((item) => ({
          productSlug: item.productSlug,
          quantity: item.quantity,
          priceAtOrder: item.price_at_order,
        })),
      }),
      notifyNewOrder(notification),
      notifyNewOrderOnWhatsApp(notification),
    ]);
  });

  return {
    ok: true,
    order: {
      id: order.id,
      wilaya: input.wilaya,
      commune,
      deliveryMethod: input.deliveryMethod,
      deliveryFee,
      productsTotal,
      orderTotal: order.order_total,
      items: orderItems.map((item) => ({
        productName: item.productName,
        productSlug: item.productSlug,
        colorName: item.colorName,
        quantity: item.quantity,
        priceAtOrder: item.price_at_order,
      })),
    },
  };
}
