"use client";

import { useEffect, useRef, useState } from "react";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";
import {
  MAX_ORDER_QUANTITY,
  useDirectOrder,
  type DirectOrderProduct,
} from "@/lib/useDirectOrder";

// The whole order, on the product page, in one card — no cart, no basket
// step, no separate checkout screen.
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
// that always states the full amount payable. The button is the only call to
// action on the page.
//
// Everything that isn't presentation — pricing, delivery fees, validation,
// pixel events — lives in useDirectOrder, shared with the ad landing page's
// very differently-styled version of the same form.

export function DirectOrderForm({
  product,
  colors,
  selectedColorId,
  onSelectColor,
  rates,
}: {
  product: DirectOrderProduct;
  colors: ProductColorDetail[];
  // Colour lives in the parent because it also drives the photo alongside
  // this form — see ProductDetail.
  selectedColorId: number | undefined;
  onSelectColor: (id: number) => void;
  rates: DeliveryRate[];
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);

  const submitRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];
  const order = useDirectOrder({ product, selectedColor, rates });

  // On a phone the slip is a long way below the photo and the description, so
  // the only call to action on the page can sit off-screen for most of the
  // visit. A bar carrying the same total appears whenever the real button
  // isn't in view; tapping it jumps to the fields rather than submitting, so
  // nothing is ever ordered from a control the customer can't read in full.
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
      <div className="px-6 pt-7 sm:px-8 sm:pt-8">
        <StepLabel n={1} tint="bg-lueur">
          Choisissez la couleur
          {selectedColor ? (
            <span className="ml-1.5 font-body text-sm font-normal text-encre/55">
              — {selectedColor.colorName}
            </span>
          ) : null}
        </StepLabel>

        <div role="radiogroup" aria-label="Couleur" className="mt-3 flex flex-wrap gap-2">
          {colors.map((color) => {
            const isSelected = color.id === selectedColor?.id;
            return (
              <button
                key={color.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={!color.inStock}
                onClick={() => onSelectColor(color.id)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                  isSelected
                    ? "border-encre bg-papier shadow-sm"
                    : "border-encre/15 bg-papier/60"
                } ${
                  color.inStock ? "hover:border-encre" : "cursor-not-allowed opacity-45"
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-encre/20"
                  style={{ backgroundColor: color.colorHex ?? "#e5d9cf" }}
                >
                  {isSelected ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3 text-papier drop-shadow-[0_0_1px_rgba(58,46,54,0.9)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  ) : null}
                </span>
                {color.colorName}
                {!color.inStock ? (
                  <span className="text-xs text-encre/50">(rupture)</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ② Quantity ──────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-7 sm:px-8">
        <StepLabel n={2} tint="bg-crepuscule">
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
      </div>

      {/* The tear line. Everything above is what you're buying, everything
          below is where it goes. */}
      <div className="order-perf" />

      {/* ── ③ Where to deliver ──────────────────────────────────────── */}
      <div ref={detailsRef} className="px-6 pt-7 sm:px-8">
        <StepLabel n={3} tint="bg-sauge">
          Où on vous livre ?
        </StepLabel>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input
                required
                value={order.firstName}
                onChange={(e) => order.setFirstName(e.target.value)}
                autoComplete="given-name"
                className="input"
              />
            </Field>
            <Field label="Nom">
              <input
                required
                value={order.lastName}
                onChange={(e) => order.setLastName(e.target.value)}
                autoComplete="family-name"
                className="input"
              />
            </Field>
          </div>

          <Field label="Téléphone" hint="On vous appelle pour confirmer">
            <input
              required
              type="tel"
              inputMode="tel"
              value={order.phone}
              onChange={(e) => order.setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="0555 12 34 56"
              className="input"
            />
          </Field>

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
      <div className="mt-7 rounded-b-[1.75rem] border-t border-dashed border-encre/15 bg-papier/70 px-6 py-6 sm:px-8">
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
              ) : (
                <span className="text-encre/45">choisissez la wilaya</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between border-t border-encre/10 pt-2 font-heading text-lg">
            <dt>À payer à la livraison</dt>
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
          className="mt-5 w-full rounded-full bg-lueur px-6 py-4 font-heading text-base text-encre shadow-[0_10px_30px_-12px_var(--lueur)] transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
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
      </div>

      {order.inStock && !ctaVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-encre/10 bg-papier/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-encre/55">{product.name}</p>
              <p className="font-heading text-base leading-tight">
                {formatPrice(order.total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="ml-auto shrink-0 rounded-full bg-lueur px-6 py-3 font-heading text-sm text-encre shadow-sm transition hover:bg-lueur/90"
            >
              Commander
            </button>
          </div>
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
    <p className="flex items-center gap-2.5 font-heading text-base">
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-encre ${tint}`}
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
