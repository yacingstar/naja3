import "server-only";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

// Server-side Purchase events (Meta's Conversions API).
//
// The browser pixel in `lib/analytics.ts` already reports Purchase. This is
// the same event sent a second time, from the server, and the two are NOT
// double-counted: both carry `event_id: order-<id>`, which is what Meta
// de-duplicates on. `analytics.ts` has passed that `eventID` since the pixel
// was first added, which is why this file needed no change over there.
//
// Why send it twice at all: the browser copy is lost whenever an ad blocker
// strips fbevents.js, Safari expires the cookie, or the customer closes the
// tab on the redirect to /commande/confirmation before the effect runs. The
// server copy leaves from Netlify and can't be blocked, so a real sale is
// still reported. This is the fix for Events Manager's "faible qualité des
// données" notice.
//
// Deliberately NOT collecting email. This is a cash-on-delivery shop; the
// order form asks for a phone number and nothing else that identifies a
// person, and adding an email field to raise a match score would cost more
// orders than it's worth. Phone + name + commune + wilaya + IP + user agent
// is a strong match set on its own.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

// Optional, and normally unset. With it, Meta routes the event to Events
// Manager -> Test Events and keeps it OUT of reporting, attribution and ad
// optimisation — which is the only safe way to prove this works, since there
// is no staging ad account any more than there is a staging database. Get the
// code from Events Manager -> Test Events; it rotates, so never commit one.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

// Pinned rather than floating: Meta keeps each version working for about two
// years, and an unpinned URL would change behaviour under us without a
// deploy. Bump deliberately, after checking the changelog.
const GRAPH_API_VERSION = "v23.0";

// Meta hashes are plain SHA-256 hex of a *normalised* value. Normalisation is
// not cosmetic — "Alger" and "alger" hash to completely different strings, so
// getting it wrong silently produces a 0% match rate rather than an error.
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Names, communes and wilayas: lowercase, and drop everything that isn't a
// letter or digit (spaces, apostrophes, hyphens — "Sidi M'Hamed" and
// "sidi mhamed" must land on the same hash).
function normalizeText(raw: string): string {
  return raw.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// Meta wants country code + subscriber number, digits only, no leading zero
// and no punctuation: 0555 12 34 56 -> 213555123456.
//
// The order form already enforces /^0[0-9]{8,9}$/, so the 00-prefix and
// already-has-213 branches are defensive — a phone typed as +213... or
// 00213... would otherwise hash as 21300213... and match nobody.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return "";
  if (digits.startsWith("213")) return digits;
  return `213${digits.replace(/^0+/, "")}`;
}

function hashField(raw: string, normalize: (value: string) => string): string[] | undefined {
  const clean = normalize(raw ?? "");
  return clean ? [sha256(clean)] : undefined;
}

export type CapiPurchase = {
  orderId: number;
  orderTotal: number;
  firstName: string;
  lastName: string;
  phone: string;
  wilaya: string;
  commune: string;
  items: Array<{ productSlug: string; quantity: number; priceAtOrder: number }>;
};

// Never throws and never returns a failure the caller has to handle. The
// order is already written to Supabase by the time this runs — a tracking
// call must not be able to turn a successful sale into an error, or delay
// the customer's confirmation page. Problems go to the Netlify function log.
export async function sendPurchaseEvent(purchase: CapiPurchase): Promise<void> {
  // Same discipline as the browser pixel: no ID or no token means do
  // nothing at all, so local development never writes into the ad account.
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  try {
    const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);

    // These four are sent RAW, never hashed — Meta matches them directly.
    // `_fbp`/`_fbc` are the pixel's own cookies and are by far the strongest
    // signal available: they tie this order to the exact browser that
    // clicked the ad. They only exist if the browser pixel actually loaded,
    // which is precisely the case this server call is backstopping.
    const fbp = cookieStore.get("_fbp")?.value;
    const fbc = cookieStore.get("_fbc")?.value;
    const clientIp =
      headerList.get("x-nf-client-connection-ip") ??
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientUserAgent = headerList.get("user-agent");

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          // Must be byte-identical to the browser's `eventID` in
          // analytics.ts -> trackPurchase, or Meta counts two sales.
          event_id: `order-${purchase.orderId}`,
          event_source_url: headerList.get("referer") ?? undefined,
          action_source: "website",
          user_data: {
            ph: hashField(purchase.phone, normalizePhone),
            fn: hashField(purchase.firstName, normalizeText),
            ln: hashField(purchase.lastName, normalizeText),
            ct: hashField(purchase.commune, normalizeText),
            st: hashField(purchase.wilaya, normalizeText),
            country: hashField("dz", normalizeText),
            fbp,
            fbc,
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent ?? undefined,
          },
          custom_data: {
            currency: "DZD",
            // The order total including delivery — the same number the
            // browser event sends, because a deduplicated pair must agree
            // on value or Meta reports whichever arrived first.
            value: purchase.orderTotal,
            content_type: "product",
            content_ids: purchase.items.map((item) => item.productSlug),
            contents: purchase.items.map((item) => ({
              id: item.productSlug,
              quantity: item.quantity,
              item_price: item.priceAtOrder,
            })),
            num_items: purchase.items.reduce((sum, item) => sum + item.quantity, 0),
            order_id: String(purchase.orderId),
          },
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The token goes in the body, not the query string: Meta logs
        // request URLs, and a token in a URL ends up in far more logs than
        // one in a POST body.
        body: JSON.stringify({
          ...payload,
          ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
          access_token: ACCESS_TOKEN,
        }),
        // Netlify bills function time and Meta occasionally hangs. Five
        // seconds is far longer than a normal round trip.
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      // Body, not just status: Meta returns the actual reason (bad token,
      // malformed field) in JSON, and the status alone is always 400.
      console.error(
        `[meta-capi] Purchase order-${purchase.orderId} rejected (${response.status}):`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`[meta-capi] Purchase order-${purchase.orderId} failed:`, error);
  }
}
