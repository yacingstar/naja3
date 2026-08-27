"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { placeOrder } from "@/app/(site)/commande/actions";
import { trackAddToCart, trackInitiateCheckout } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { stashOrder } from "@/lib/lastOrder";
import type { ProductColorDetail } from "@/lib/products";

// Everything a one-product, no-cart order needs, minus the markup.
//
// There are two of these forms and they look nothing alike: the storefront's
// order slip (warm, rounded, papier) and the ad landing page's order block
// (Modernist — square, red, 2px rules). What they must never disagree about is
// the part a customer can't see: which wilaya costs what, that stopdesk isn't
// offered everywhere, what counts as a valid Algerian phone number, and which
// pixel events fire when. That all lives here; each component only decides how
// it looks.

export const MAX_ORDER_QUANTITY = 10;

export type DirectOrderProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
};

export function useDirectOrder({
  product,
  selectedColor,
  rates,
}: {
  product: DirectOrderProduct;
  // Owned by the page, not by this hook — on both pages the chosen colour also
  // drives the photograph, so the selection has to live above the form.
  selectedColor: ProductColorDetail | undefined;
  rates: DeliveryRate[];
}) {
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"domicile" | "stopdesk">(
    "domicile",
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inStock = Boolean(selectedColor?.inStock);

  const selectedRate = useMemo(
    () => rates.find((r) => r.wilaya === wilaya),
    [rates, wilaya],
  );
  // Only *known* to be unavailable once a wilaya is picked. Treating "no
  // wilaya yet" as unavailable greys the option out on arrival, which reads as
  // "we don't do stopdesk" rather than "tell us where you are first".
  const stopdeskUnavailable =
    selectedRate != null && selectedRate.stopdeskPrice == null;
  const deliveryFee = selectedRate
    ? deliveryMethod === "domicile"
      ? selectedRate.domicilePrice
      : (selectedRate.stopdeskPrice ?? 0)
    : null;

  const subtotal = product.price * quantity;
  const total = subtotal + (deliveryFee ?? 0);

  // InitiateCheckout used to fire on reaching /commande with a full cart, a
  // moment that no longer exists. The equivalent signal is the first time
  // someone actually starts filling a form in — a ref because it must fire
  // exactly once and must not re-render anything.
  const started = useRef(false);
  function handleFirstInput() {
    if (started.current) return;
    started.current = true;
    trackInitiateCheckout({ value: subtotal, numItems: 1 });
  }

  function changeWilaya(next: string) {
    setWilaya(next);
    // Stopdesk isn't offered in every wilaya. Silently leaving it selected
    // would send an order the Server Action then rejects.
    const nextRate = rates.find((r) => r.wilaya === next);
    if (deliveryMethod === "stopdesk" && nextRate?.stopdeskPrice == null) {
      setDeliveryMethod("domicile");
    }
  }

  function increment() {
    setQuantity((q) => Math.min(MAX_ORDER_QUANTITY, q + 1));
  }
  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !selectedColor) return;

    if (!wilaya) {
      setError("Merci de choisir votre wilaya.");
      return;
    }
    // Mirrors the Server Action's own check so a typo is caught next to the
    // field instead of after a round trip. The server still re-validates: this
    // is a convenience, never the guarantee.
    if (!/^0[0-9]{8,9}$/.test(phone.replace(/[\s.-]/g, ""))) {
      setError("Merci d'indiquer un numéro de téléphone valide (ex. 0555 12 34 56).");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await placeOrder({
      firstName,
      lastName,
      phone,
      wilaya,
      commune,
      deliveryMethod,
      note,
      items: [{ productId: product.id, colorId: selectedColor.id, quantity }],
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    // Reported on a placed order rather than on a cart write, which no longer
    // happens anywhere. Meta still wants the step: without it every Purchase
    // would follow nothing at all.
    trackAddToCart({
      id: product.slug,
      name: product.name,
      value: subtotal,
      quantity,
    });

    stashOrder(result.order);
    router.push("/commande/confirmation");
  }

  return {
    quantity,
    increment,
    decrement,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    wilaya,
    changeWilaya,
    commune,
    setCommune,
    deliveryMethod,
    setDeliveryMethod,
    note,
    setNote,
    submitting,
    error,
    inStock,
    selectedRate,
    stopdeskUnavailable,
    deliveryFee,
    subtotal,
    total,
    handleSubmit,
    handleFirstInput,
  };
}
