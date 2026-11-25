"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { placeOrder } from "@/app/(site)/commande/actions";
import { trackAddToCart, trackInitiateCheckout } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { stashOrder } from "@/lib/lastOrder";
import { analyserTelephone } from "@/lib/phone";
import type { CartPart } from "@/lib/cart";
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
  parts,
  rates,
}: {
  product: DirectOrderProduct;
  // Owned by the page, not by this hook — on both pages the chosen colour also
  // drives the photograph, so the selection has to live above the form.
  selectedColor: ProductColorDetail | undefined;
  // Les couleurs pièce par pièce d'un produit personnalisable, choisies au
  // même endroit et pour la même raison : elles pilotent le dessin.
  parts?: CartPart[];
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

  // Le champ téléphone, pour pouvoir y RAMENER la cliente.
  //
  // Sans ça, le formulaire avait un trou noir : les champs vides sont retenus
  // par le navigateur (`required`), mais un numéro mal formé — un 021, neuf
  // chiffres au lieu de dix — passe cette barrière et n'est refusé qu'ici. Le
  // message s'écrivait alors sous un champ situé à cinq cents pixels au-dessus
  // du bouton, hors de l'écran d'un téléphone, et `setError(null)` effaçait au
  // même instant le seul message qui, lui, était visible. Résultat vu de la
  // cliente : on appuie sur « Commander », et il ne se passe rien. On appuie
  // encore. On s'en va.
  //
  // Le champ est tenu par une fonction de rappel, et c'est elle qui sort d'ici
  // — pas l'objet `useRef`. Rendre un ref depuis un hook « contamine » tout
  // l'objet retourné aux yeux de la règle react-hooks/refs, qui interdit alors
  // de lire `order.total` pendant le rendu : trente-huit erreurs pour une
  // commodité. Une fonction ne pose pas ce problème, et le formulaire l'écrit
  // de la même façon : `ref={order.brancherTelephone}`.
  const champTelephone = useRef<HTMLInputElement | null>(null);
  const brancherTelephone = useCallback((el: HTMLInputElement | null) => {
    champTelephone.current = el;
  }, []);

  // Trois choix, et chacun a sa raison :
  //
  // - `center` et non `start` : l'en-tête est fixe, et un champ amené tout en
  //   haut de l'écran atterrit dessous.
  // - pas de `smooth` : l'animation a été essayée et écartée. Elle dépend du
  //   rythme d'affichage, et un onglet ralenti (arrière-plan, téléphone en
  //   économie d'énergie) l'étire au point qu'il ne se passe visiblement rien
  //   pendant une seconde ou deux — précisément le défaut qu'on corrige ici.
  //   Un saut net arrive toujours.
  // - `preventScroll` sur le focus : sans lui, le navigateur refait son propre
  //   défilement par-dessus celui qu'on vient de faire, et le champ se
  //   retrouve collé en haut.
  function montrerLeTelephone() {
    const champ = champTelephone.current;
    if (!champ) return;
    champ.scrollIntoView({ block: "center" });
    champ.focus({ preventScroll: true });
  }

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
      montrerLeTelephone();
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
      items: [
        {
          productId: product.id,
          colorId: selectedColor.id,
          quantity,
          // Seulement le nom de la teinte : le serveur relit le libellé et la
          // couleur réelle dans filament_colors, comme il relit le prix.
          parts: parts?.map((p) => ({ slot: p.slot, name: p.name })),
        },
      ],
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
    // À accrocher au champ téléphone : `ref={order.brancherTelephone}`. C'est
    // ce qui permet de ramener la cliente sur son numéro au lieu de la laisser
    // devant un bouton qui ne réagit pas.
    brancherTelephone,
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
