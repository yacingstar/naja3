"use client";

import type { DeliveryRate } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";
import {
  MAX_ORDER_QUANTITY,
  useDirectOrder,
  type DirectOrderProduct,
} from "@/lib/useDirectOrder";

// The same order the storefront's slip takes, in the landing page's own
// language. Nothing is shared with DirectOrderForm but `useDirectOrder` —
// which is the point: the two pages must never disagree on delivery pricing
// or what a valid phone number is, and must look nothing alike.
//
// Modernist rules apply here: square corners, 2px rules drawn as grid gaps
// (never borders — see .lp-cols), uppercase labels, one red.

export function LandingOrderForm({
  product,
  colors,
  selectedColorId,
  onSelectColor,
  rates,
}: {
  product: DirectOrderProduct;
  colors: ProductColorDetail[];
  selectedColorId: number | undefined;
  onSelectColor: (id: number) => void;
  rates: DeliveryRate[];
}) {
  const selectedColor =
    colors.find((c) => c.id === selectedColorId) ?? colors[0];
  const order = useDirectOrder({ product, selectedColor, rates });

  return (
    <form
      id="commander"
      onSubmit={order.handleSubmit}
      onInput={order.handleFirstInput}
      className="lp-order"
    >
      <div className="lp-order-grid">
        {/* ── Left: what you're choosing and where it goes ──────────── */}
        <div className="lp-order-main">
          <fieldset className="lp-field-group">
            <legend className="lp-order-step">
              <span aria-hidden>01</span> Couleur
            </legend>
            <div
              className="lp-order-colors"
              role="radiogroup"
              aria-label="Couleur"
            >
              {colors.map((option) => {
                const selected = option.id === selectedColor?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!option.inStock}
                    onClick={() => onSelectColor(option.id)}
                    className="lp-order-color"
                  >
                    <span
                      aria-hidden
                      className="lp-order-chip"
                      style={{ background: option.colorHex ?? "#d7d3d3" }}
                    />
                    <span>{option.colorName}</span>
                    {!option.inStock ? <em>rupture</em> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="lp-field-group">
            <legend className="lp-order-step">
              <span aria-hidden>02</span> Quantité
            </legend>
            <div className="lp-order-qty">
              <button
                type="button"
                onClick={order.decrement}
                disabled={order.quantity <= 1}
                aria-label="Diminuer la quantité"
              >
                −
              </button>
              <span aria-live="polite">{order.quantity}</span>
              <button
                type="button"
                onClick={order.increment}
                disabled={order.quantity >= MAX_ORDER_QUANTITY}
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>
          </fieldset>

          <fieldset className="lp-field-group">
            <legend className="lp-order-step">
              <span aria-hidden>03</span> Vos coordonnées
            </legend>

            <div className="lp-order-fields">
              <label className="lp-field">
                <span>Prénom</span>
                <input
                  required
                  value={order.firstName}
                  onChange={(e) => order.setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </label>
              <label className="lp-field">
                <span>Nom</span>
                <input
                  required
                  value={order.lastName}
                  onChange={(e) => order.setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </label>

              <label className="lp-field lp-field-wide">
                <span>Téléphone</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={order.phone}
                  onChange={(e) => order.setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="0555 12 34 56"
                />
              </label>

              <label className="lp-field">
                <span>Wilaya</span>
                <select
                  required
                  value={order.wilaya}
                  onChange={(e) => {
                    order.changeWilaya(e.target.value);
                    order.handleFirstInput();
                  }}
                  autoComplete="address-level1"
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
              </label>
              <label className="lp-field">
                <span>Commune</span>
                <input
                  required
                  value={order.commune}
                  onChange={(e) => order.setCommune(e.target.value)}
                  autoComplete="address-level2"
                />
              </label>
            </div>

            <div className="lp-order-ship">
              <ShipChoice
                checked={order.deliveryMethod === "domicile"}
                onChange={() => order.setDeliveryMethod("domicile")}
                title="À domicile"
                price={
                  order.selectedRate
                    ? formatPrice(order.selectedRate.domicilePrice)
                    : "—"
                }
              />
              <ShipChoice
                checked={order.deliveryMethod === "stopdesk"}
                onChange={() => order.setDeliveryMethod("stopdesk")}
                disabled={order.stopdeskUnavailable}
                title="Stopdesk"
                price={
                  order.selectedRate?.stopdeskPrice != null
                    ? formatPrice(order.selectedRate.stopdeskPrice)
                    : order.selectedRate
                      ? "Indisponible"
                      : "—"
                }
              />
            </div>
          </fieldset>
        </div>

        {/* ── Right: the bill ───────────────────────────────────────── */}
        <div className="lp-order-side">
          <div className="lp-order-side-inner">
            <p className="lp-kicker">Récapitulatif</p>

            <dl className="lp-order-sum">
              <div>
                <dt>
                  {order.quantity} × {product.name}
                  {selectedColor ? ` · ${selectedColor.colorName}` : ""}
                </dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Livraison</dt>
                <dd>
                  {order.deliveryFee != null
                    ? formatPrice(order.deliveryFee)
                    : "—"}
                </dd>
              </div>
              <div className="lp-order-total">
                <dt>À payer</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>

            {order.error ? (
              <p role="alert" className="lp-order-error">
                {order.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={order.submitting || !order.inStock}
              className="lp-btn lp-btn-lg lp-btn-primary lp-order-submit"
            >
              {!order.inStock
                ? "Rupture de stock"
                : order.submitting
                  ? "Envoi en cours…"
                  : `Commander · ${formatPrice(order.total)}`}
            </button>

            <p className="lp-order-fine">
              Paiement en espèces à la livraison. Aucune carte, aucun paiement
              en ligne. On vous appelle pour confirmer avant l&apos;envoi.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

function ShipChoice({
  checked,
  onChange,
  disabled,
  title,
  price,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title: string;
  price: string;
}) {
  return (
    <label
      className="lp-ship"
      data-checked={checked}
      data-disabled={disabled || undefined}
    >
      <input
        type="radio"
        name="lpDeliveryMethod"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="lp-ship-title">{title}</span>
      <span className="lp-ship-price">{price}</span>
    </label>
  );
}
