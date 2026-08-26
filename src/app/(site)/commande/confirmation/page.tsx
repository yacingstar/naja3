"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderSummary } from "@/app/(site)/commande/actions";
import { trackPurchase } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

const LAST_ORDER_KEY = "naja-last-order";

// Reads the order summary the checkout Server Action returned, stashed in
// sessionStorage — never fetched by order ID/reference, so a shared or
// guessed link can't reveal another customer's name/phone/address. Cleared
// after one read: a page refresh falls back to the generic message below.
export default function ConfirmationPage() {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) {
        const parsed: OrderSummary = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only API unavailable during SSR; matching server/client first render, then syncing post-mount is the standard fix, not a smell here
        setOrder(parsed);
        // Real revenue, not just "a conversion happened" — this is what lets
        // Meta optimise for money rather than for form submissions. Read
        // before the key is cleared, and keyed by order id so a refresh
        // cannot double-count.
        trackPurchase({
          orderId: parsed.id,
          value: parsed.orderTotal,
          contents: parsed.items.map((i) => ({
            id: i.productSlug,
            quantity: i.quantity,
          })),
        });
        sessionStorage.removeItem(LAST_ORDER_KEY);
      }
    } catch {
      // sessionStorage unavailable — fall back to the generic message below
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="font-hand text-2xl text-crepuscule">merci !</p>
      <h1 className="mt-2 font-heading text-3xl">Votre commande est confirmée</h1>
      <p className="mt-4 text-encre/70">
        Nous vous appellerons prochainement pour confirmer les détails avant
        l&apos;expédition. Paiement en espèces à la livraison.
      </p>

      {order ? (
        <div className="mt-10 rounded-2xl border border-encre/10 bg-blush/20 p-6 text-left">
          <p className="text-sm text-encre/50">Commande n°{order.id}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between">
                <span>
                  {item.quantity} × {item.productName} ({item.colorName})
                </span>
                <span>{formatPrice(item.priceAtOrder * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-encre/10 pt-4 text-sm">
            <p className="flex justify-between">
              <span>
                Livraison ({order.deliveryMethod === "domicile" ? "à domicile" : "stopdesk"})
              </span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </p>
            <p className="flex justify-between font-heading text-base">
              <span>Total</span>
              <span>{formatPrice(order.orderTotal)}</span>
            </p>
          </div>
          <p className="mt-4 text-sm text-encre/70">
            Livraison à {order.commune}, {order.wilaya}.
          </p>
        </div>
      ) : null}

      <Link
        href="/boutique"
        className="mt-10 inline-block rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90"
      >
        Continuer mes achats
      </Link>
    </main>
  );
}
