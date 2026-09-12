import "server-only";

import { headers } from "next/headers";

import { formatPrice } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";

// New-order notifications to the shop owner's Telegram.
//
// Why this exists: orders land in Supabase and sit in /admin/commandes with
// status `nouvelle` until someone happens to look. This is a cash-on-delivery
// shop, so the step that turns an order into a sale is the owner phoning the
// customer to confirm — and a customer who isn't called back promptly is a
// customer who reconsiders. This gets the order onto her phone in about a
// second, with everything that call needs.
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
// recoverable by design: the order is already safe in the database and shows
// as `nouvelle` in the admin whether or not this succeeds. The notification is
// a convenience on top of the record, never the record itself.

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

export type NewOrderNotification = {
  orderId: number;
  firstName: string;
  lastName: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryMethod: "domicile" | "stopdesk";
  note: string;
  deliveryFee: number;
  productsTotal: number;
  orderTotal: number;
  items: Array<{
    productName: string;
    colorName: string;
    quantity: number;
    price_at_order: number;
  }>;
};

// The site's own origin, for a tappable link straight to the order in the
// admin. Derived from the request rather than a seventh env var — capi.ts
// already proves request APIs are readable inside `after()`.
//
// Isolated in its own try/catch on purpose: outside a request context
// `headers()` throws, and that must cost the link, not the whole message.
async function adminOrderUrl(orderId: number): Promise<string | null> {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    if (!host) return null;
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}/admin/commandes/${orderId}`;
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

// Never throws and never returns a failure the caller has to handle — same
// contract as sendPurchaseEvent, and for the same reason: the order is already
// written by the time this runs, so a notification must not be able to turn a
// completed sale into an error or delay the customer's confirmation page.
// Problems go to the Netlify function log.
export async function notifyNewOrder(order: NewOrderNotification): Promise<void> {
  // Same discipline as the pixel and the CAPI: no token or no chat means do
  // nothing at all, so local development never messages the owner.
  if (!BOT_TOKEN || !CHAT_ID) return;

  try {
    const text = buildOrderMessage(order, await adminOrderUrl(order.orderId));

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        // The message ends with a wa.me and an admin link; without this
        // Telegram appends a preview card for one of them and buries the
        // order details above the fold.
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
      // waiting on it, and it runs concurrently with the CAPI call rather than
      // after it, so the pair still finishes inside Netlify's 10s default
      // rather than needing 16s.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Body, not just status: Telegram puts the real reason in `description`.
      // The overwhelmingly likely one is 403 "bot can't initiate conversation
      // with a user" — a bot cannot message someone who has never pressed
      // Start in its chat.
      console.error(
        `[telegram] Order #${order.orderId} notification rejected (${response.status}):`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`[telegram] Order #${order.orderId} notification failed:`, error);
  }
}
