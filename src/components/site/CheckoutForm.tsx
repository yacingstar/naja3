"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { placeOrder, type OrderSummary } from "@/app/(site)/commande/actions";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { DeliveryRate } from "@/lib/deliveryRates";

const LAST_ORDER_KEY = "naja-last-order";

export function CheckoutForm({ rates }: { rates: DeliveryRate[] }) {
  const router = useRouter();
  const { items, totalPrice, clear } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"domicile" | "stopdesk">("domicile");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRate = useMemo(() => rates.find((r) => r.wilaya === wilaya), [rates, wilaya]);
  const stopdeskAvailable = selectedRate?.stopdeskPrice != null;
  const deliveryFee = selectedRate
    ? deliveryMethod === "domicile"
      ? selectedRate.domicilePrice
      : (selectedRate.stopdeskPrice ?? 0)
    : null;

  function handleWilayaChange(nextWilaya: string) {
    setWilaya(nextWilaya);
    const nextRate = rates.find((r) => r.wilaya === nextWilaya);
    if (deliveryMethod === "stopdesk" && nextRate?.stopdeskPrice == null) {
      setDeliveryMethod("domicile");
    }
  }

  if (items.length === 0) {
    return (
      <p className="mx-auto mt-8 max-w-md text-center text-encre/70">
        Votre panier est vide.{" "}
        <Link href="/boutique" className="underline hover:text-lueur">
          Découvrir la collection
        </Link>
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wilaya) {
      setError("Merci de choisir une wilaya.");
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
      items: items.map((item) => ({
        productId: item.productId,
        colorId: item.colorId,
        quantity: item.quantity,
      })),
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const summary: OrderSummary = result.order;
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(summary));
    } catch {
      // sessionStorage unavailable — confirmation page falls back to a generic message
    }
    clear();
    router.push("/commande/confirmation");
  }

  const runningTotal = totalPrice + (deliveryFee ?? 0);

  return (
    <form onSubmit={handleSubmit} className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom">
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Nom">
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Téléphone">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0555 12 34 56"
            className="input"
          />
        </Field>

        <Field label="Wilaya">
          <select
            required
            value={wilaya}
            onChange={(e) => handleWilayaChange(e.target.value)}
            className="input"
          >
            <option value="" disabled>
              Choisir une wilaya
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
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="input"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-encre/70">Livraison</legend>
          <div className="flex gap-3">
            <label
              className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-sm ${
                deliveryMethod === "domicile" ? "border-encre" : "border-encre/20"
              }`}
            >
              <input
                type="radio"
                name="deliveryMethod"
                value="domicile"
                checked={deliveryMethod === "domicile"}
                onChange={() => setDeliveryMethod("domicile")}
                className="mr-2"
              />
              À domicile
            </label>
            <label
              className={`flex-1 rounded-xl border px-4 py-3 text-sm ${
                stopdeskAvailable
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              } ${deliveryMethod === "stopdesk" ? "border-encre" : "border-encre/20"}`}
            >
              <input
                type="radio"
                name="deliveryMethod"
                value="stopdesk"
                disabled={!stopdeskAvailable}
                checked={deliveryMethod === "stopdesk"}
                onChange={() => setDeliveryMethod("stopdesk")}
                className="mr-2"
              />
              Stopdesk
            </label>
          </div>
        </fieldset>

        <Field label="Note (optionnelle)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="input"
            placeholder="Instructions de livraison, par exemple."
          />
        </Field>
      </div>

      <div className="h-fit rounded-2xl border border-encre/10 bg-blush/20 p-6">
        <h2 className="font-heading text-lg">Récapitulatif</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={`${item.productId}:${item.colorId}`} className="flex justify-between">
              <span>
                {item.quantity} × {item.productName} ({item.colorName})
              </span>
              <span>{formatPrice(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-encre/10 pt-4 text-sm">
          <p className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatPrice(totalPrice)}</span>
          </p>
          <p className="flex justify-between">
            <span>Livraison</span>
            <span>{deliveryFee != null ? formatPrice(deliveryFee) : "—"}</span>
          </p>
          <p className="flex justify-between font-heading text-base">
            <span>Total</span>
            <span>{formatPrice(runningTotal)}</span>
          </p>
        </div>
        <p className="mt-3 text-xs text-encre/50">Paiement en espèces à la livraison.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-lueur px-8 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Envoi en cours…" : "Confirmer la commande"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-encre/70">{label}</span>
      {children}
    </label>
  );
}
