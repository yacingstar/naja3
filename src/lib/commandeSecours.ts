import "server-only";

import catalogue from "@/data/catalogue.json";
import { notifyNewOrderOnWhatsApp } from "@/lib/notify/whatsapp";
import type { NewOrderNotification } from "@/lib/notify/order";
import type { PlaceOrderInput, PlaceOrderResult } from "@/app/(site)/commande/actions";

// Ce qui se passe quand une cliente commande alors que la base ne répond pas.
//
// Écrit le 6 novembre 2026, parce que ce jour-là la réponse à cette question
// était « rien » : Supabase avait restreint le projet, `placeOrder` échouait
// sur sa première requête et renvoyait « Une erreur est survenue, merci de
// réessayer. » La cliente réessayait, échouait encore, et partait.
//
// Une commande perdue est pire qu'une boutique fermée. Le montage ici est donc
// volontairement rustique : tout est calculé depuis le catalogue figé, et la
// commande est envoyée sur le téléphone de la patronne. Telegram devient le
// registre, le temps que la base revienne.
//
// Ce que ça ne fait pas, et qu'il faut savoir : la commande n'est PAS dans la
// base. Elle n'apparaîtra pas dans l'admin et devra être ressaisie à la main.
// Le message le dit en toutes lettres plutôt que de laisser croire le
// contraire. Le stock vient d'un instantané : une couleur épuisée depuis la
// panne passera quand même, et c'est assumé — refuser une vraie commande sur
// une donnée périmée coûte plus cher que d'appeler la cliente.

type ColorisJson = {
  id: number;
  colorName: string;
  inStock: boolean;
};

type ProduitJson = {
  id: number;
  slug: string;
  name: string;
  price: number;
  colors: ColorisJson[];
};

type TarifJson = {
  wilaya: string;
  domicilePrice: number;
  stopdeskPrice: number | null;
};

const PRODUITS = (catalogue.produits ?? []) as ProduitJson[];
const LIVRAISON = (catalogue.livraison ?? []) as TarifJson[];

export function secoursPossible(): boolean {
  return PRODUITS.length > 0 && LIVRAISON.length > 0;
}

export function tarifLocal(
  wilaya: string,
  methode: "domicile" | "stopdesk",
): number | null {
  const t = LIVRAISON.find((x) => x.wilaya === wilaya);
  if (!t) return null;
  return methode === "domicile" ? t.domicilePrice : t.stopdeskPrice;
}

// Un numéro de repère, pas un identifiant de base. En secondes depuis 1970 :
// jamais deux fois le même, impossible à confondre avec les identifiants réels
// (qui en sont à quelques centaines), et assez court pour être dicté au
// téléphone.
function reference(): number {
  return Math.floor(Date.now() / 1000);
}

async function previenirSurTelegram(texte: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: texte,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      // Le même budget que notify/telegram.ts, et pour la même raison : un
      // résolveur DNS froid mange 5s à lui seul. Ici la cliente attend
      // vraiment la réponse, mais elle doit attendre : c'est cet envoi qui
      // décide si sa commande existe quelque part.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[secours] Telegram a refusé", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[secours] Telegram injoignable", error);
    return false;
  }
}

function message(n: NewOrderNotification, ref: number): string {
  const echapper = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lignes = n.items
    .map((i) => `• ${echapper(i.productName)} — ${echapper(i.colorName)} × ${i.quantity}`)
    .join("\n");

  return [
    "⚠️ <b>COMMANDE À RESSAISIR</b>",
    "",
    "La base de données ne répondait pas : cette commande n'est <b>pas</b> dans l'admin.",
    `Repère : <b>${ref}</b>`,
    "",
    `<b>${echapper(n.firstName)} ${echapper(n.lastName)}</b>`,
    `📞 <a href="tel:${echapper(n.phone)}">${echapper(n.phone)}</a>`,
    `📍 ${echapper(n.commune)}, ${echapper(n.wilaya)} — ${n.deliveryMethod === "domicile" ? "à domicile" : "stopdesk"}`,
    "",
    lignes,
    "",
    `Articles : ${n.productsTotal} DA`,
    `Livraison : ${n.deliveryFee} DA`,
    `<b>Total : ${n.orderTotal} DA</b>`,
    n.note ? `\n📝 ${echapper(n.note)}` : "",
    "",
    "<i>À recopier dans l'admin dès que la base est rétablie.</i>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function passerCommandeDeSecours(
  input: PlaceOrderInput,
  identite: { firstName: string; lastName: string; phone: string; commune: string; note: string },
): Promise<PlaceOrderResult> {
  if (!secoursPossible()) {
    return { ok: false, error: "Une erreur est survenue, merci de réessayer." };
  }

  const deliveryFee = tarifLocal(input.wilaya, input.deliveryMethod);
  if (deliveryFee == null) {
    return input.deliveryMethod === "stopdesk"
      ? { ok: false, error: "Le stopdesk n'est pas disponible pour cette wilaya." }
      : { ok: false, error: "Wilaya invalide." };
  }

  const lignes = [];
  for (const item of input.items) {
    if (item.quantity < 1) return { ok: false, error: "Quantité invalide." };
    const produit = PRODUITS.find((p) => p.id === item.productId);
    const coloris = produit?.colors.find((c) => c.id === item.colorId);
    if (!produit || !coloris) {
      return { ok: false, error: "Un des articles de votre panier n'existe plus." };
    }
    lignes.push({
      productName: produit.name,
      productSlug: produit.slug,
      colorName: coloris.colorName,
      quantity: item.quantity,
      priceAtOrder: produit.price,
    });
  }

  const productsTotal = lignes.reduce((s, l) => s + l.priceAtOrder * l.quantity, 0);
  const orderTotal = productsTotal + deliveryFee;
  const ref = reference();

  const notification: NewOrderNotification = {
    orderId: ref,
    firstName: identite.firstName,
    lastName: identite.lastName,
    phone: identite.phone,
    wilaya: input.wilaya,
    commune: identite.commune,
    deliveryMethod: input.deliveryMethod,
    note: identite.note,
    deliveryFee,
    productsTotal,
    orderTotal,
    items: lignes.map((l) => ({
      productName: l.productName,
      colorName: l.colorName,
      quantity: l.quantity,
      price_at_order: l.priceAtOrder,
    })),
  };

  // Attendu, pas lancé en arrière-plan : sur le chemin normal la commande est
  // déjà en base quand les notifications partent, donc leur échec n'a pas
  // d'importance. Ici c'est l'inverse — l'envoi EST l'enregistrement. On ne
  // peut pas annoncer « c'est commandé » sans savoir qu'il est parti.
  const parti = await previenirSurTelegram(message(notification, ref));

  // WhatsApp en plus, sans attendre de garantie : un deuxième canal ne peut
  // que faire du bien, mais il ne décide de rien.
  void notifyNewOrderOnWhatsApp(notification).catch(() => {});

  if (!parti) {
    return {
      ok: false,
      error:
        "Nous ne pouvons pas enregistrer votre commande pour le moment. " +
        "Écrivez-nous sur Instagram @naja.dz avec votre choix, nous la prenons à la main.",
    };
  }

  return {
    ok: true,
    order: {
      id: ref,
      wilaya: input.wilaya,
      commune: identite.commune,
      deliveryMethod: input.deliveryMethod,
      deliveryFee,
      productsTotal,
      orderTotal,
      items: lignes,
    },
  };
}
