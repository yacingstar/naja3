// Thin wrapper over the ad pixels — Meta's `fbq` and TikTok's `ttq` — so call
// sites never have to care which platforms are configured, loaded, or
// blocked. Each track* function fans out to every configured pixel.
//
// Every one of these is a no-op for a platform whose ID is unset
// (NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_TIKTOK_PIXEL_ID) — which is the case
// locally unless you deliberately set them. Without that, every test checkout
// would fire a fake Purchase into the ad accounts and teach them to go looking
// for more people like whoever is developing.
//
// It also no-ops when the pixel's global is missing entirely, which happens
// more often than you'd think: ad blockers remove it, and a good share of
// visitors run one. Tracking must never be able to break a page.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

const CURRENCY = "DZD";

type Fbq = (...args: unknown[]) => void;

function fbq(): Fbq | null {
  if (!META_PIXEL_ID) return null;
  const w = window as unknown as { fbq?: Fbq };
  return typeof w.fbq === "function" ? w.fbq : null;
}

type Ttq = {
  page: () => void;
  track: (event: string, params?: object, options?: object) => void;
};

function ttq(): Ttq | null {
  if (!TIKTOK_PIXEL_ID) return null;
  const w = window as unknown as { ttq?: Partial<Ttq> };
  return typeof w.ttq?.track === "function" ? (w.ttq as Ttq) : null;
}

// TikTok wants each product as one object carrying its own id, rather than
// Meta's separate content_ids array. Same slug as Meta's id, so both catalogues
// (if one is ever connected) match on the same key.
type TikTokContent = {
  content_id: string;
  content_type: "product";
  content_name?: string;
  quantity?: number;
  price?: number;
};

export function trackPageView() {
  fbq()?.("track", "PageView");
  ttq()?.page();
}

// Meta matches these against the catalogue by content_ids, and uses `value`
// to optimise for revenue rather than raw conversion count. TikTok does the
// same with `contents` + `value`.
export function trackViewContent(p: { id: string; name: string; value: number }) {
  fbq()?.("track", "ViewContent", {
    content_ids: [p.id],
    content_name: p.name,
    content_type: "product",
    value: p.value,
    currency: CURRENCY,
  });
  ttq()?.track("ViewContent", {
    contents: [
      {
        content_id: p.id,
        content_type: "product",
        content_name: p.name,
        price: p.value,
      },
    ] satisfies TikTokContent[],
    value: p.value,
    currency: CURRENCY,
  });
}

export function trackAddToCart(p: {
  id: string;
  name: string;
  value: number;
  quantity: number;
}) {
  fbq()?.("track", "AddToCart", {
    content_ids: [p.id],
    content_name: p.name,
    content_type: "product",
    contents: [{ id: p.id, quantity: p.quantity }],
    value: p.value,
    currency: CURRENCY,
  });
  ttq()?.track("AddToCart", {
    contents: [
      {
        content_id: p.id,
        content_type: "product",
        content_name: p.name,
        quantity: p.quantity,
      },
    ] satisfies TikTokContent[],
    value: p.value,
    currency: CURRENCY,
  });
}

export function trackInitiateCheckout(p: { value: number; numItems: number }) {
  fbq()?.("track", "InitiateCheckout", {
    value: p.value,
    num_items: p.numItems,
    currency: CURRENCY,
  });
  ttq()?.track("InitiateCheckout", {
    value: p.value,
    currency: CURRENCY,
  });
}

// `eventID` is the order id so Meta can de-duplicate: if the customer
// refreshes the confirmation page, or a server-side Conversions API event is
// ever added alongside this one, the same purchase is not counted twice.
// TikTok takes the same id as `event_id`, for the same reason (and for its
// Events API, if that is ever added).
//
// TikTok's event is `Purchase`, its current standard name. The older
// `CompletePayment` still works but TikTok steers new setups away from it.
export function trackPurchase(p: {
  orderId: number;
  value: number;
  contents: Array<{ id: string; quantity: number }>;
}) {
  const eventId = `order-${p.orderId}`;

  fbq()?.(
    "track",
    "Purchase",
    {
      value: p.value,
      currency: CURRENCY,
      content_type: "product",
      contents: p.contents,
      content_ids: p.contents.map((c) => c.id),
    },
    { eventID: eventId },
  );
  ttq()?.track(
    "Purchase",
    {
      contents: p.contents.map(
        (c): TikTokContent => ({
          content_id: c.id,
          content_type: "product",
          quantity: c.quantity,
        }),
      ),
      value: p.value,
      currency: CURRENCY,
    },
    { event_id: eventId },
  );
}
