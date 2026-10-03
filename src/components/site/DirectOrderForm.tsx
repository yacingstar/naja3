"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { resumeTarifs } from "@/lib/deliveryRatesSummary";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";
import { ColorSwatches } from "@/components/site/ColorSwatches";
import { trackAddToCart } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import {
  MAX_ORDER_QUANTITY,
  useDirectOrder,
  type DirectOrderProduct,
} from "@/lib/useDirectOrder";

// The whole order, on the product page, in one card — no basket step, no
// separate checkout screen.
//
// This replaced the add-to-cart button here because of a specific, observed
// problem rather than a preference: customers were adding a lamp to the cart
// and leaving, believing they had bought it. That is not carelessness, it is
// the pattern being wrong for the market — for cash-on-delivery buyers there
// is no payment step to make "I have finished" obvious, so the basket reads
// as a confirmation. Every Algerian COD store the client compared against
// (casedz.store among them) takes the order inline for the same reason.
//
// So the design leans hard on looking like a form you fill in and send: an
// order slip, numbered steps, a perforated tear line, and a submit button
// that always states the full amount payable.
//
// `withCart` puts the basket back as a SECONDARY action, on the shop's product
// page only. The reason it was removed has not gone away, so it is not undone:
// the slip stays, "Commander" stays the only primary button, and what lands in
// the basket is framed as something still being collected ("il reste à passer
// la commande") rather than as a finished purchase. What it buys is the case
// the slip alone could not serve — two *different* lamps in one delivery, which
// used to mean two orders and two delivery fees.
//
// It stays off on /lampe/[slug]: those are paid-traffic pages whose whole point
// is one place to order, and a second call to action there would spend the ad
// click on a decision instead of on the form.
//
// Everything that isn't presentation — pricing, delivery fees, validation,
// pixel events — lives in useDirectOrder, shared with the landing pages.

export function DirectOrderForm({
  product,
  colors,
  selectedColorId,
  onSelectColor,
  showColorStep = true,
  withCart = false,
  rates,
}: {
  product: DirectOrderProduct;
  colors: ProductColorDetail[];
  // Colour lives in the parent because it also drives the photo alongside
  // this form — see ProductDetail.
  selectedColorId: number | undefined;
  onSelectColor: (id: number) => void;
  // The detail page renders the swatches beside the photo instead, so it
  // turns this step off here and the two remaining steps renumber.
  showColorStep?: boolean;
  // Off by default, and only the shop's product page turns it on — see the
  // note at the top of this file for why the ad landing pages keep one
  // single place to order.
  withCart?: boolean;
  rates: DeliveryRate[];
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [scrolledIn, setScrolledIn] = useState(false);
  const [addedColorId, setAddedColorId] = useState<number | null>(null);

  const submitRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];
  const order = useDirectOrder({ product, selectedColor, rates });

  // Le plus bas tarif de la grille, pour répondre à « et la livraison ? » avant
  // que la wilaya ne soit choisie. Le calcul du total, lui, ne change pas : il
  // reste `deliveryFee ?? 0` tant qu'aucune wilaya n'est sélectionnée.
  const resume = resumeTarifs(rates);

  // The basket. Read even when `withCart` is off, because hooks can't be
  // conditional — and it costs nothing: this component is only ever rendered
  // inside the (site) layout's CartProvider.
  const { items, addItem } = useCart();

  // A lit "✓ Ajouté" that puts itself out, so the next tap isn't misread as
  // the first one failing.
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    [],
  );

  // The 10-per-lamp ceiling the slip enforces applies to the basket too —
  // otherwise the same lamp could be ordered as 10 here and 20 from /panier,
  // which is a limit with no reason behind it.
  const alreadyInCart = selectedColor
    ? (items.find(
        (i) => i.productId === product.id && i.colorId === selectedColor.id,
      )?.quantity ?? 0)
    : 0;
  const roomInCart = MAX_ORDER_QUANTITY - alreadyInCart;
  const canAddToCart = order.inStock && roomInCart > 0;

  // Which colour was last added, rather than a plain boolean: derived from the
  // current selection, so switching to another colour drops the "Ajouté" state
  // by itself instead of claiming the new colour is the one in the basket.
  // Adjusting the quantity keeps it — that colour really is in there.
  const justAdded = addedColorId !== null && addedColorId === selectedColor?.id;

  function handleAddToCart() {
    if (!selectedColor || !canAddToCart) return;

    const quantity = Math.min(order.quantity, roomInCart);

    addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        colorId: selectedColor.id,
        colorName: selectedColor.colorName,
        // A display snapshot only. placeOrder re-prices every line from the
        // live catalogue before anything is written — see lib/cart.tsx.
        unitPrice: product.price,
        // Same rule as colorPhotoUrl in lib/products.ts: the cutout when the
        // admin has set one, the first gallery shot otherwise.
        photoUrl:
          selectedColor.cutoutPhotoUrl ?? selectedColor.photos[0]?.url ?? null,
      },
      quantity,
    );

    trackAddToCart({
      id: product.slug,
      name: product.name,
      value: product.price * quantity,
      quantity,
    });

    setAddedColorId(selectedColor.id);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddedColorId(null), 2500);
  }

  // The slip sits a long way below the photograph and the description on both
  // pages that use it, so the only call to action can be off-screen for most
  // of a visit. A pill follows the scroll instead, carrying the same live
  // total. Tapping it jumps to the fields rather than submitting, so nothing
  // is ever ordered from a control the customer can't read in full.
  useEffect(() => {
    const target = submitRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -80px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // ...but not straight away. At the top of either page there is already a
  // Commander button on screen, and popping a second one over the hero the
  // moment it loads is noise. It arrives once you've started reading.
  useEffect(() => {
    const onScroll = () => setScrolledIn(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Le lien « + Ajouter un autre modèle » se suffit à lui-même : il ne reste
  // ici que ce qu'il faut dire quand il ne PEUT pas servir. `null` dans le cas
  // normal, pour que le lien soit seul et discret.
  const cartHint = !order.inStock
    ? "Ce coloris est en rupture."
    : roomInCart <= 0
      ? `Maximum ${MAX_ORDER_QUANTITY} par commande pour ce coloris.`
      : null;

  return (
    <form
      onSubmit={order.handleSubmit}
      onInput={order.handleFirstInput}
      className="order-slip mt-8"
    >
      {/* No title on the slip. It carried a "commande directe" heading, a line
          explaining that there is no cart, and a "sans paiement en ligne"
          badge — the badge repeated the line under the submit button, and the
          other two spent the card's opening explaining a mechanism instead of
          getting on with it. The numbered steps and a button naming the amount
          payable already say what this is. */}

      {/* ── ① Colour ────────────────────────────────────────────────── */}
      {showColorStep ? (
        <div className="px-6 pt-7 sm:px-8 sm:pt-8">
          <StepLabel n={1} tint="bg-lueur">
            Choisissez la couleur
          </StepLabel>
          <ColorSwatches
            colors={colors}
            selectedColorId={selectedColor?.id}
            onSelectColor={onSelectColor}
            className="mt-3"
          />
        </div>
      ) : null}

      {/* ── ② Quantity ──────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-7 sm:px-8">
        <StepLabel n={showColorStep ? 2 : 1} tint="bg-crepuscule">
          Combien en voulez-vous ?
        </StepLabel>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-full border border-encre/15 bg-papier p-1">
            <StepperButton
              label="Diminuer la quantité"
              onClick={order.decrement}
              disabled={order.quantity <= 1}
            >
              −
            </StepperButton>
            <span aria-live="polite" className="w-8 text-center font-heading text-lg">
              {order.quantity}
            </span>
            <StepperButton
              label="Augmenter la quantité"
              onClick={order.increment}
              disabled={order.quantity >= MAX_ORDER_QUANTITY}
            >
              +
            </StepperButton>
          </div>
          <p className="font-heading text-xl">{formatPrice(order.subtotal)}</p>
        </div>

        {/* Plus de bouton panier ici. Il était le PREMIER bouton de la page,
            avant même le formulaire de livraison : les clientes cliquaient
            dessus, se croyaient servies, et s'arrêtaient là — beaucoup
            d'ajouts au panier, très peu de commandes. La possibilité de
            commander plusieurs modèles existe toujours, mais plus bas et
            discrète : voir le lien sous le bouton Commander. */}
      </div>

      {/* The tear line. Everything above is what you're buying, everything
          below is where it goes. */}
      <div className="order-perf" />

      {/* ── ③ Where to deliver ──────────────────────────────────────── */}
      {/* `scroll-mt` : le bouton collant amène ici en `block: "start"`, et sans
          cette marge le premier champ atterrissait SOUS l'en-tête fixe — on
          appuie sur « Commander », et on ne voit pas le formulaire. La hauteur
          vient de la même variable que partout ailleurs. */}
      <div
        ref={detailsRef}
        className="scroll-mt-[var(--header-height)] px-6 pt-7 sm:px-8"
      >
        <StepLabel n={showColorStep ? 3 : 2} tint="bg-sauge">
          Où on vous livre ?
        </StepLabel>

        <div className="mt-4 space-y-3">
          {/* Un seul champ de nom. Deux champs sur un téléphone, c'est un
              champ de trop : le clavier s'ouvre deux fois, et chaque champ
              supplémentaire est une occasion d'abandonner. Le serveur redécoupe
              en prénom / nom pour la base — voir decouperNom. */}
          <Field label="Nom complet">
            <input
              required
              value={order.nomComplet}
              onChange={(e) => order.setNomComplet(e.target.value)}
              autoComplete="name"
              placeholder="Amina Belkacem"
              className="input"
            />
          </Field>

          {/* L'erreur de téléphone vit SOUS son champ, pas auprès du bouton :
              c'est là qu'on la corrige. `aria-describedby` la relie au champ
              pour les lecteurs d'écran, et `role="alert"` la fait annoncer. */}
          <div>
            <Field label="Téléphone" hint="On vous appelle pour confirmer">
              <input
                required
                type="tel"
                inputMode="tel"
                value={order.phone}
                onChange={(e) => order.setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="05 / 06 / 07 XX XX XX XX"
                aria-invalid={order.erreurTelephone ? true : undefined}
                aria-describedby={order.erreurTelephone ? "erreur-telephone" : undefined}
                className="input"
              />
            </Field>
            {order.erreurTelephone ? (
              <p
                id="erreur-telephone"
                role="alert"
                className="mt-1.5 text-[13px] font-medium text-red-700"
              >
                {order.erreurTelephone}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Wilaya">
              <select
                required
                value={order.wilaya}
                onChange={(e) => {
                  order.changeWilaya(e.target.value);
                  order.handleFirstInput();
                }}
                autoComplete="address-level1"
                className="input"
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {rates.map((rate) => (
                  <option key={rate.wilaya} value={rate.wilaya}>
                    {rate.wilaya}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commune">
              <input
                required
                value={order.commune}
                onChange={(e) => order.setCommune(e.target.value)}
                autoComplete="address-level2"
                className="input"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-encre/70">
              Mode de livraison
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <DeliveryChoice
                checked={order.deliveryMethod === "domicile"}
                onChange={() => order.setDeliveryMethod("domicile")}
                title="À domicile"
                price={
                  order.selectedRate ? formatPrice(order.selectedRate.domicilePrice) : null
                }
                icon={<path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />}
              />
              <DeliveryChoice
                checked={order.deliveryMethod === "stopdesk"}
                onChange={() => order.setDeliveryMethod("stopdesk")}
                disabled={order.stopdeskUnavailable}
                title="Stopdesk"
                price={
                  order.selectedRate?.stopdeskPrice != null
                    ? formatPrice(order.selectedRate.stopdeskPrice)
                    : order.selectedRate
                      ? "Indisponible"
                      : null
                }
                icon={<path d="M4 8h16l-1 12H5L4 8Zm4 0V6a4 4 0 0 1 8 0v2" />}
              />
            </div>
          </fieldset>

          {/* Folded away by default. It is genuinely optional, and an empty
              textarea sitting open reads as one more thing to fill in. */}
          {noteOpen ? (
            <Field label="Note pour la livraison">
              <textarea
                value={order.note}
                onChange={(e) => order.setNote(e.target.value)}
                rows={2}
                autoFocus
                className="input"
                placeholder="Un repère, un horaire qui vous arrange…"
              />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="text-sm text-encre/55 underline decoration-dotted underline-offset-4 transition hover:text-encre"
            >
              + Ajouter une note (optionnel)
            </button>
          )}
        </div>
      </div>

      {/* ── Total and send ──────────────────────────────────────────── */}
      <div className="mt-7 rounded-b-[2.25rem] border-t-2 border-dashed border-encre/20 bg-papier/70 px-6 py-6 sm:px-8">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-encre/65">
              {order.quantity} × {product.name}
            </dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-encre/65">Livraison</dt>
            <dd>
              {order.deliveryFee != null ? (
                formatPrice(order.deliveryFee)
              ) : resume.minimum !== null ? (
                // Un chiffre plutôt que « choisissez la wilaya » : la même
                // information qu'un ordre de grandeur, sans faire semblant de
                // connaître la wilaya. Le montant exact arrive dès qu'elle est
                // choisie, et le total se met à jour avec.
                <span className="text-encre/55">
                  à partir de {formatPrice(resume.minimum)}
                </span>
              ) : (
                <span className="text-encre/45">choisissez la wilaya</span>
              )}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-encre/15 pt-2.5 font-heading text-xl font-semibold">
            {/* Tant qu'aucune wilaya n'est choisie, le montant affiché ne
                contient pas la livraison — le dire ici plutôt que de laisser
                croire à un prix tout compris. La valeur, elle, ne change pas. */}
            <dt>{order.deliveryFee != null ? "À payer à la livraison" : "Total, hors livraison"}</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>

        {order.error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-blush/40 px-4 py-2.5 text-sm text-encre"
          >
            {order.error}
          </p>
        ) : null}

        <button
          ref={submitRef}
          type="submit"
          disabled={order.submitting || !order.inStock}
          className="mt-5 w-full rounded-full bg-encre px-6 py-4 font-heading text-lg text-papier shadow-[0_8px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
        >
          {!order.inStock
            ? "Rupture de stock"
            : order.submitting
              ? "Envoi en cours…"
              : `Commander · ${formatPrice(order.total)}`}
        </button>

        <p className="mt-3 text-center text-xs text-encre/55">
          Paiement en espèces à la livraison · Aucune carte demandée
        </p>

        {/* Le seul chemin vers plusieurs modèles — et discret par
            construction. C'était un gros bouton placé AVANT le formulaire :
            il détournait la commande au lieu de la servir. Sous le bouton
            Commander, il ne peut plus être pris pour l'action principale.
            `aria-live` parce que rien d'autre n'annonce le changement d'état :
            le lien pressé garde le focus. */}
        {withCart ? (
          <p aria-live="polite" className="mt-5 text-center text-[13px] leading-snug">
            {justAdded ? (
              <span className="font-medium text-encre/75">
                ✓ Ajouté au panier ·{" "}
                <Link
                  href="/panier"
                  className="underline decoration-dotted underline-offset-4 hover:text-encre"
                >
                  Voir le panier
                </Link>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="font-medium text-encre/60 underline decoration-dotted underline-offset-4 transition hover:text-encre disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Ajouter un autre modèle à ma commande
              </button>
            )}
            {!justAdded && cartHint ? (
              <span className="mt-1 block text-encre/50">{cartHint}</span>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* Floats over the page rather than pinning a full-width bar to the
          bottom: it reads as a button someone put there for you, covers almost
          nothing, and works the same on a phone and a desktop. */}
      {order.inStock && scrolledIn && !ctaVisible ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() =>
              detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="cta-float pointer-events-auto flex items-center gap-2.5 rounded-full bg-encre px-7 py-3.5 font-heading text-base text-papier transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span aria-hidden className="cta-float-bulb" />
            Commander · {formatPrice(order.total)}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function StepLabel({
  n,
  tint,
  children,
}: {
  n: number;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2.5 font-heading text-lg font-semibold">
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-encre text-sm text-encre ${tint}`}
      >
        {n}
      </span>
      <span>{children}</span>
    </p>
  );
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-encre/8 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function DeliveryChoice({
  checked,
  onChange,
  disabled,
  title,
  price,
  icon,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title: string;
  price: string | null;
  icon: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm transition ${
        checked ? "border-encre bg-papier shadow-sm" : "border-encre/15 bg-papier/60"
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:border-encre/40"}`}
    >
      <input
        type="radio"
        name="deliveryMethod"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-5 w-5 shrink-0 text-encre/60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
      <span className="min-w-0">
        <span className="block truncate font-medium">{title}</span>
        {price ? <span className="block text-xs text-encre/55">{price}</span> : null}
      </span>
    </label>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-encre/70">{label}</span>
        {hint ? <span className="text-xs text-encre/45">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
