// Thin wrapper over Meta's `fbq`, so call sites never have to care whether
// the pixel is configured, loaded, or blocked.
//
// Every one of these is a no-op when NEXT_PUBLIC_META_PIXEL_ID is unset —
// which is the case locally unless you deliberately set it. Without that,
// every test checkout would fire a fake Purchase into the ad account and
// teach Meta to go looking for more people like whoever is developing.
//
// It also no-ops when `fbq` is missing entirely, which happens more often
// than you'd think: ad blockers remove it, and a good share of visitors run
// one. Tracking must never be able to break a page.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = (...args: unknown[]) => void;

function fbq(): Fbq | null {
  if (!META_PIXEL_ID) return null;
  const w = window as unknown as { fbq?: Fbq };
  return typeof w.fbq === "function" ? w.fbq : null;
}

export function trackPageView() {
  fbq()?.("track", "PageView");
}

// Meta matches these against the catalogue by content_ids, and uses `value`
// to optimise for revenue rather than raw conversion count.
export function trackViewContent(p: { id: string; name: string; value: number }) {
  fbq()?.("track", "ViewContent", {
    content_ids: [p.id],
    content_name: p.name,
    content_type: "product",
    value: p.value,
    currency: "DZD",
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
    currency: "DZD",
  });
}

export function trackInitiateCheckout(p: { value: number; numItems: number }) {
  fbq()?.("track", "InitiateCheckout", {
    value: p.value,
    num_items: p.numItems,
    currency: "DZD",
  });
}

// `eventID` is the order id so Meta can de-duplicate: if the customer
// refreshes the confirmation page, or a server-side Conversions API event is
// ever added alongside this one, the same purchase is not counted twice.
export function trackPurchase(p: {
  orderId: number;
  value: number;
  contents: Array<{ id: string; quantity: number }>;
}) {
  fbq()?.(
    "track",
    "Purchase",
    {
      value: p.value,
      currency: "DZD",
      content_type: "product",
      contents: p.contents,
      content_ids: p.contents.map((c) => c.id),
    },
    { eventID: `order-${p.orderId}` },
  );
}
