"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { placeOrder } from "@/app/(site)/commande/actions";
import { trackAddToCart, trackInitiateCheckout } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { stashOrder } from "@/lib/lastOrder";
import { analyserTelephone } from "@/lib/phone";
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
  // Un seul champ de nom, pour aller plus vite au doigt sur un téléphone. Le
  // découpage en prénom / nom se fait côté serveur (decouperNom), pas ici.
  const [nomComplet, setNomComplet] = useState("");
  const [phone, setPhoneState] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"domicile" | "stopdesk">(
    "domicile",
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Séparé de `error` : celle-ci s'affiche SOUS le champ téléphone, à l'endroit
  // où on la corrige. Une erreur reléguée auprès du bouton oblige à remonter
  // pour comprendre.
  const [erreurTelephone, setErreurTelephone] = useState<string | null>(null);

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

  // InitiateCheckout has to mean "started filling the form in", not "arrived
  // at a page". For the slip that is the first keystroke, not the landing —
  // there is no separate screen to arrive at. (Arriving at /commande with a
  // basket still reports itself, from CheckoutForm.) A ref because it must
  // fire exactly once and must not re-render anything.
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

  // Le champ téléphone efface son erreur dès qu'on le corrige : laisser le
  // message pendant la correction donne l'impression que rien ne va plus.
  function setPhone(next: string) {
    setPhoneState(next);
    if (erreurTelephone) setErreurTelephone(null);
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

    if (!nomComplet.trim()) {
      setError("Merci d'indiquer votre nom complet.");
      return;
    }
    if (!wilaya) {
      setError("Merci de choisir votre wilaya.");
      return;
    }
    // Mêmes vérifications que la Server Action, pour que la faute se corrige à
    // côté du champ au lieu d'après un aller-retour réseau. Le serveur
    // revalide : ceci est une commodité, jamais la garantie.
    const telephone = analyserTelephone(phone);
    if (!telephone.ok) {
      setErreurTelephone(telephone.erreur);
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setErreurTelephone(null);

    const result = await placeOrder({
      nomComplet: nomComplet.trim(),
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

    // Fires on a placed order rather than on a basket write. There is no
    // basket write on this path — the slip orders in one go — and this hook
    // also drives the ad landing pages, which have no basket at all. Without
    // it every Purchase from those pages would follow nothing. On the shop's
    // product page the real basket write reports AddToCart too, from
    // DirectOrderForm; a customer who does both is counted twice mid-funnel,
    // which is harmless, and Purchase is de-duplicated by order id.
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
    nomComplet,
    setNomComplet,
    phone,
    setPhone,
    erreurTelephone,
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
