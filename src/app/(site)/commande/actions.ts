"use server";

import { after } from "next/server";

import { sendPurchaseEvent } from "@/lib/meta/capi";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlaceOrderInput = {
  firstName: string;
  lastName: string;
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
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const commune = input.commune.trim();
  const note = input.note.trim();

  if (!firstName || !lastName || !commune) {
    return { ok: false, error: "Merci de remplir tous les champs obligatoires." };
  }
  if (!/^0[0-9]{8,9}$/.test(phone.replace(/[\s.-]/g, ""))) {
    return { ok: false, error: "Merci d'indiquer un numéro de téléphone valide." };
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

  // Server-side Purchase, after the sale is safely in the database and only
  // on the success path — an abandoned or rejected order must never be
  // reported. `after` runs it once the response has already gone out, so the
  // customer reaches the confirmation page without waiting on Meta; request
  // APIs (cookies/headers) are still readable inside the callback because
  // this is a Server Function. See next/dist/docs .../functions/after.md.
  after(() =>
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
  );

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
