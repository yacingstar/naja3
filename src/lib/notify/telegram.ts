import "server-only";

import { headers } from "next/headers";

import { formatDateAtelier, formatPrice } from "@/lib/format";
// The payload shape is shared with the WhatsApp notifier now — see order.ts for
// why it lives on its own rather than here.
import type { NewOrderNotification } from "@/lib/notify/order";
import { normalizePhone } from "@/lib/phone";

// Everything that reaches the shop owner's Telegram, in one file.
//
// Why this exists at all: orders land in Supabase and sit in /admin/commandes
// with status `nouvelle` until someone happens to look. This is a cash-on-
// delivery shop, so the step that turns an order into a sale is the owner
// phoning the customer to confirm — and a customer who isn't called back
// promptly is a customer who reconsiders. This gets the order onto her phone
// in about a second, with everything that call needs.
//
// Why Telegram over email or WhatsApp: free with no per-message cost, instant,
// no dependency to add, and no approval process. WhatsApp's Cloud API needs a
// Business account, a dedicated number not already registered on WhatsApp, and
// pre-approved templates for business-initiated messages; email is slower to
// reach a phone and risks the spam folder, which is the wrong trade for
// something time-critical.
//
// Deliberately no delivery guarantee — no retry, no queue, no `notified_at`
// column. A failed send is logged and lost, which is acceptable because it is
// recoverable by design: the thing is already safe in the database whether or
// not this succeeds. The notification is a convenience on top of the record,
// never the record itself.
//
// Workshop registrations (notifyNewRegistration, at the bottom) live here
// rather than in a third module: one token, one place to look when the
// question is "what pings my phone?", and — the actual reason — the send
// itself, with its 8s deadline and its catch-all, then exists exactly once.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Telegram's own cap is 4096 characters and it rejects the whole message if
// exceeded. The note is the only unbounded field, so it is cut first; the
// overall guard is a backstop for an implausibly long order.
const MAX_NOTE_LENGTH = 300;
const MAX_MESSAGE_LENGTH = 4000;

// `parse_mode: "HTML"` needs exactly these three escaped. MarkdownV2 would
// need ~18 characters escaped and rejects the entire message on a single miss,
// which is why this is HTML.
//
// This is not cosmetic: the customer's free-text note is untrusted input
// arriving in the owner's private chat. Unescaped, a note containing an anchor
// tag would render as a live link she might tap.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const DELIVERY_LABEL: Record<"domicile" | "stopdesk", string> = {
  domicile: "À domicile",
  stopdesk: "Stopdesk",
};

// The site's own origin, for a tappable link straight to the thing in the
// admin. Derived from the request rather than a seventh env var — capi.ts
// already proves request APIs are readable inside `after()`.
//
// Isolated in its own try/catch on purpose: outside a request context
// `headers()` throws, and that must cost the link, not the whole message.
async function lienAdmin(chemin: string): Promise<string | null> {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    if (!host) return null;
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}${chemin}`;
  } catch {
    return null;
  }
}

// Exported for verification: renders the exact text that would be sent, so the
// formatting and escaping can be checked without sending anything.
export function buildOrderMessage(
  order: NewOrderNotification,
  adminUrl: string | null,
): string {
  const name = escapeHtml(`${order.firstName} ${order.lastName}`);
  const place = escapeHtml(`${order.wilaya} — ${order.commune}`);

  const lines = [
    `🔔 <b>Nouvelle commande #${order.orderId}</b>`,
    "",
    `👤 ${name}`,
    // Printed plainly rather than as a tel: link — Telegram's mobile clients
    // linkify phone numbers themselves, and tel: hrefs are not in the set of
    // schemes Telegram accepts in an <a> tag.
    `📞 ${escapeHtml(order.phone)}`,
    `📍 ${place}`,
    `🚚 ${DELIVERY_LABEL[order.deliveryMethod]}`,
    "",
  ];

  for (const item of order.items) {
    const label = `${escapeHtml(item.productName)} (${escapeHtml(item.colorName)})`;
    lines.push(
      `${item.quantity} × ${label} — ${formatPrice(item.price_at_order * item.quantity)}`,
    );
  }

  lines.push(
    "",
    `Sous-total : ${formatPrice(order.productsTotal)}`,
    `Livraison : ${formatPrice(order.deliveryFee)}`,
    `<b>Total : ${formatPrice(order.orderTotal)}</b>`,
  );

  const note = order.note.trim();
  if (note) {
    const truncated =
      note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH)}…` : note;
    lines.push("", `📝 « ${escapeHtml(truncated)} »`);
  }

  // One tap to WhatsApp the customer, which is how most of these conversations
  // actually happen here. An https URL, unlike tel:, is guaranteed to survive
  // Telegram's link handling.
  const international = normalizePhone(order.phone);
  if (international) {
    lines.push("", `📱 https://wa.me/${international}`);
  }
  if (adminUrl) {
    lines.push(`🔗 ${adminUrl}`);
  }

  const message = lines.join("\n");
  return message.length > MAX_MESSAGE_LENGTH
    ? message.slice(0, MAX_MESSAGE_LENGTH)
    : message;
}

// ── Les inscriptions aux ateliers ────────────────────────────────────────────

/** Ce qu'un message d'inscription a besoin de porter. */
export type NewRegistrationNotification = {
  workshopId: number;
  workshopTitle: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  phone: string;
};

// Exported for the same reason as buildOrderMessage: the escaping can be
// checked without sending anything to a real phone.
export function buildRegistrationMessage(
  registration: NewRegistrationNotification,
  adminUrl: string | null,
): string {
  // The workshop title is the owner's own text, but it is escaped anyway —
  // one rule for every value that reaches this message, so nobody has to
  // decide later which ones are safe.
  const lines = [
    `🎨 <b>Nouvelle inscription — ${escapeHtml(registration.workshopTitle)}</b>`,
    "",
    `👤 ${escapeHtml(`${registration.firstName} ${registration.lastName}`)}`,
    `📞 ${escapeHtml(registration.phone)}`,
    `📅 ${escapeHtml(formatDateAtelier(registration.startsAt))}`,
  ];

  const international = normalizePhone(registration.phone);
  if (international) {
    lines.push("", `📱 https://wa.me/${international}`);
  }
  if (adminUrl) {
    lines.push(`🔗 ${adminUrl}`);
  }

  const message = lines.join("\n");
  return message.length > MAX_MESSAGE_LENGTH
    ? message.slice(0, MAX_MESSAGE_LENGTH)
    : message;
}

// ── L'envoi, une seule fois ──────────────────────────────────────────────────

/**
 * Envoie un message au Telegram de la patronne. Ne lève jamais.
 *
 * Le corps de cet envoi vivait dans notifyNewOrder ; il en est sorti quand les
 * inscriptions ont eu besoin du même. Deux copies auraient été deux endroits
 * où régler un problème de réseau — et surtout deux occasions d'oublier le
 * `catch` qui empêche une panne Telegram de faire échouer une inscription déjà
 * enregistrée.
 *
 * `etiquette` sert uniquement au journal : elle dit QUELLE notification a
 * échoué, ce qu'un numéro de commande seul ne dit pas.
 */
async function envoyerMessageTelegram(texte: string, etiquette: string): Promise<void> {
  // Same discipline as the pixel and the CAPI: no token or no chat means do
  // nothing at all, so local development never messages the owner.
  if (!BOT_TOKEN || !CHAT_ID) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: texte,
        parse_mode: "HTML",
        // The message ends with a wa.me and an admin link; without this
        // Telegram appends a preview card for one of them and buries the
        // details above the fold.
        disable_web_page_preview: true,
      }),
      // 8s, not 5s, and the extra 3s is not padding. This budget has to cover
      // DNS, and a cold resolver can stall for a full 5s on its own — measured
      // here, where an uncached api.telegram.org lookup took 5.02s and blew a
      // 5s deadline before the request had even left the machine. A cold
      // Lambda has a cold resolver too, so that is a production scenario, not
      // a local quirk.
      //
      // Safe to be this generous: it runs inside `after()`, so no customer is
      // waiting on it, and it runs concurrently with the other notifiers
      // rather than after them, so the set still finishes inside Netlify's 10s
      // default rather than needing 16s.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Body, not just status: Telegram puts the real reason in `description`.
      // The overwhelmingly likely one is 403 "bot can't initiate conversation
      // with a user" — a bot cannot message someone who has never pressed
      // Start in its chat.
      console.error(
        `[telegram] ${etiquette} rejected (${response.status}):`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`[telegram] ${etiquette} failed:`, error);
  }
}

// Never throws and never returns a failure the caller has to handle — same
// contract as sendPurchaseEvent, and for the same reason: the order is already
// written by the time this runs, so a notification must not be able to turn a
// completed sale into an error or delay the customer's confirmation page.
// Problems go to the Netlify function log.
export async function notifyNewOrder(order: NewOrderNotification): Promise<void> {
  const texte = buildOrderMessage(order, await lienAdmin(`/admin/commandes/${order.orderId}`));
  await envoyerMessageTelegram(texte, `Order #${order.orderId} notification`);
}

// Same contract as notifyNewOrder, and it matters just as much here: the
// registration is in the database before this runs, so a Telegram outage must
// never turn a successful sign-up into an error message for the visitor.
export async function notifyNewRegistration(
  registration: NewRegistrationNotification,
): Promise<void> {
  const texte = buildRegistrationMessage(
    registration,
    await lienAdmin(`/admin/ateliers/${registration.workshopId}`),
  );
  await envoyerMessageTelegram(
    texte,
    `Inscription atelier #${registration.workshopId}`,
  );
}
