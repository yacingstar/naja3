import "server-only";

import { formatPrice } from "@/lib/format";
import type { NewOrderNotification } from "@/lib/notify/order";
import { normalizePhone } from "@/lib/phone";

// New-order notifications to the shop owner's WhatsApp, through Meta's official
// WhatsApp Cloud API.
//
// A second channel *beside* telegram.ts, not a replacement for it. Telegram is
// free, unlimited, needs no approval and already works; this one costs a
// fraction of a dinar per message and needs a Meta Business account, a phone
// number dedicated to the API, and a template Meta has approved. Both fire in
// the same `after()` block, so either can fail without touching the other —
// which is the point of running two.
//
// Written as a deliberate sibling of telegram.ts: same `server-only`, same
// top-level env consts, same silent no-op when unconfigured, same try/catch,
// same bracketed-prefix logging, same never-throws contract. The order is
// already written by the time this runs.
//
// Why a template and not free-form text: WhatsApp only lets a business *start*
// a conversation with an approved template. Free-form text is legal solely
// inside a 24-hour window that the recipient opens by writing first, which a
// server-initiated notification cannot rely on — it would work for an evening
// and then stop, silently. Meta answers free-form text outside the window with
// error 131047.
//
// Deliberately no fallback from template to text: a silent fallback would make
// the notification appear to work while quietly burning a paid template on
// every send, and would hide the one failure worth seeing.

// Pinned rather than configurable. Meta cuts a Graph API version every few
// months and supports each for about two years, so this is one line to bump on
// a deprecation, not a moving part for the shop owner to maintain. v23.0 is the
// version Meta's own current Cloud API sample uses.
const GRAPH_VERSION = "v23.0";

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
// The owner's own number, typed as she knows it (0555 12 34 56). normalizePhone
// turns it into the 213555123456 the API wants — the same transform the wa.me
// links use, so there is no second rule to get wrong.
const TO = process.env.WHATSAPP_TO;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME;
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG ?? "fr";

// Meta's two hard rules for a template *parameter*, and both reject the entire
// message rather than the offending value: no newlines or tabs, and no more
// than four consecutive spaces. Customer free-text and the product names the
// owner types in the admin both reach this, so it is a sanitiser, not a
// formatter.
function param(value: string): string {
  return value.replace(/[\n\r\t]+/g, " ").replace(/ {5,}/g, "    ").trim();
}

// The item lines have to collapse onto one line: a parameter cannot contain a
// newline, and there is no workaround that holds across platforms (a carriage
// return renders as a break on iOS and as a space everywhere else). Capped so
// the template text plus all six parameters stay well under Meta's 1024-char
// ceiling — roughly 200 chars of template, ~120 across the other five values.
const MAX_ITEMS_LENGTH = 400;

const DELIVERY_LABEL: Record<"domicile" | "stopdesk", string> = {
  domicile: "à domicile",
  stopdesk: "stopdesk",
};

// Exported for verification, exactly as buildOrderMessage is in telegram.ts:
// the six values that would be sent can be rendered and read without sending
// anything, which is the only way to check the escaping before Meta is set up.
//
// The order of these must match the {{1}}…{{6}} of the approved template in
// Meta. Changing one without the other sends the wrong value into the wrong
// sentence, and nothing errors.
export function buildTemplateParams(order: NewOrderNotification): string[] {
  const items = order.items
    .map((item) => `${item.quantity} × ${item.productName} (${item.colorName})`)
    .join(", ");

  return [
    String(order.orderId),
    `${order.firstName} ${order.lastName}`,
    order.phone,
    `${order.wilaya} — ${order.commune} (${DELIVERY_LABEL[order.deliveryMethod]})`,
    items.length > MAX_ITEMS_LENGTH ? `${items.slice(0, MAX_ITEMS_LENGTH)}…` : items,
    formatPrice(order.orderTotal),
  ].map(param);
}

// Never throws and never returns a failure the caller has to handle — same
// contract as notifyNewOrder and sendPurchaseEvent, and for the same reason:
// the order is already written by the time this runs, so a notification must
// not be able to turn a completed sale into an error or delay the customer's
// confirmation page. Problems go to the Netlify function log.
export async function notifyNewOrderOnWhatsApp(
  order: NewOrderNotification,
): Promise<void> {
  // Same discipline as the pixel, the CAPI and Telegram: any missing piece
  // means do nothing at all, so local development never messages the owner.
  if (!TOKEN || !PHONE_NUMBER_ID || !TO || !TEMPLATE_NAME) return;

  const to = normalizePhone(TO);
  if (!to) return;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
            components: [
              {
                type: "body",
                parameters: buildTemplateParams(order).map((text) => ({
                  type: "text",
                  text,
                })),
              },
            ],
          },
        }),
        // 8s, matching Telegram, and for the reason measured there rather than
        // for symmetry: the budget has to cover DNS, and a cold resolver stalls
        // a full 5s on its own. Safe to be that generous because this runs
        // inside `after()` — nobody is waiting on it — and because the three
        // calls in that block run concurrently, so the whole set still finishes
        // inside Netlify's 10s default instead of needing 24.
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      // Body, not just the status: Meta puts the real reason in
      // `error.message`, and the three that will actually happen are worth
      // having in the log in full —
      //   190     the access token is dead or was never valid
      //   132001  no template by that name in that language (not approved yet,
      //           or a typo in WHATSAPP_TEMPLATE_NAME)
      //   132000  a parameter broke the rules — newline, tab, or empty
      //   131047  the 24h window is closed and free-form was attempted
      console.error(
        `[whatsapp] Order #${order.orderId} notification rejected (${response.status}):`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`[whatsapp] Order #${order.orderId} notification failed:`, error);
  }
}

// Read by /admin to tell "not set up yet" apart from "not sending". A
// half-filled configuration is silent by design — that is what keeps local
// development from messaging the owner — so without this the only symptom is
// that no message arrives, which looks exactly like having no orders.
export function isWhatsAppConfigured(): boolean {
  return Boolean(TOKEN && PHONE_NUMBER_ID && TO && TEMPLATE_NAME);
}
