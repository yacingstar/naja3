import type { OrderSummary } from "@/app/(site)/commande/actions";

// How a placed order reaches the confirmation page: the Server Action returns
// the summary, whoever placed it parks it here, and the confirmation page
// reads it once.
//
// Deliberately sessionStorage and not a URL parameter or an /commande/:id
// fetch — the summary carries the customer's name, phone and address, so a
// shared or guessed link must not be able to surface somebody else's order.
// Nothing about it is looked up by id.
//
// This module exists because there are now two places that can place an order
// (the direct form on a product page, and the cart checkout) and one that
// reads the result. Three copies of a magic string is how the confirmation
// page quietly stops working when one of them is renamed.
const LAST_ORDER_KEY = "naja-last-order";

export function stashOrder(summary: OrderSummary) {
  try {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(summary));
  } catch {
    // Private browsing or a full quota — the confirmation page falls back to
    // its generic "merci" message, which is degraded but not broken.
  }
}

// Reads and clears in one go: the Purchase pixel event fires off the back of
// this, so leaving the key in place would let a refresh report the sale twice.
// (`trackPurchase` also passes an `eventID`, so a double report would be
// de-duplicated by Meta — this is the belt to that's braces.)
export function takeOrder(): OrderSummary | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LAST_ORDER_KEY);
    return JSON.parse(raw) as OrderSummary;
  } catch {
    return null;
  }
}
