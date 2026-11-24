"use client";

import Link from "next/link";
import { BlobPhoto } from "@/components/site/BlobPhoto";
import { HorlogeApercu } from "@/components/site/HorlogeApercu";
import { cleLigne, type CartItem, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

// Un produit personnalisable n'a pas de photo — il a un dessin, dans les
// couleurs que la cliente vient de choisir. C'est la même vignette que sur
// la fiche produit : elle doit retrouver SON horloge dans son panier, pas
// l'horloge verte du catalogue.
function Vignette({ item }: { item: CartItem }) {
  const couleurs = Object.fromEntries((item.parts ?? []).map((p) => [p.slot, p.hex]));
  if (item.parts?.length) {
    return (
      <HorlogeApercu
        fond={couleurs.fond ?? "#1b4d2e"}
        avant={couleurs.avant ?? "#46b65a"}
        aiguilles={couleurs.aiguilles ?? "#1b4d2e"}
        titre={item.productName}
        className="w-20 shrink-0"
      />
    );
  }
  return (
    <BlobPhoto
      src={item.photoUrl}
      alt={item.productName}
      sizes="80px"
      className="w-20 shrink-0"
    />
  );
}

export default function PanierPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-heading text-3xl">Votre panier est vide</h1>
        <Link
          href="/boutique"
          className="mt-8 inline-block rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90"
        >
          Découvrir la collection
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-center font-heading text-3xl">Votre panier</h1>

      <ul className="mt-12 divide-y divide-encre/10 border-y border-encre/10">
        {items.map((item) => {
          const cle = cleLigne(item);
          return (
            <li key={cle} className="flex flex-wrap items-center gap-4 py-6">
              <Vignette item={item} />
              <div className="min-w-[8rem] flex-1">
                <p className="font-heading">{item.productName}</p>
                {item.parts?.length ? (
                  // Les trois pièces, chacune avec sa pastille : « Sur mesure »
                  // tout seul ne dirait rien de ce qui a été choisi.
                  <ul className="mt-0.5 space-y-0.5">
                    {item.parts.map((p) => (
                      <li key={p.slot} className="flex items-center gap-1.5 text-sm text-encre/60">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full border border-encre/25"
                          style={{ background: p.hex }}
                        />
                        {p.label} : {p.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-encre/60">{item.colorName}</p>
                )}
                <p className="mt-1 text-sm text-encre/70">{formatPrice(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(cle, item.quantity - 1)}
                  aria-label="Diminuer la quantité"
                  className="h-8 w-8 rounded-full border border-encre/20 hover:border-encre"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(cle, item.quantity + 1)}
                  aria-label="Augmenter la quantité"
                  className="h-8 w-8 rounded-full border border-encre/20 hover:border-encre"
                >
                  +
                </button>
              </div>
              <p className="w-24 text-right text-sm">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
              <button
                type="button"
                onClick={() => removeItem(cle)}
                aria-label="Retirer du panier"
                className="text-sm text-encre/40 hover:text-encre"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-center justify-between">
        <p className="font-heading text-lg">Total</p>
        <p className="font-heading text-lg">{formatPrice(totalPrice)}</p>
      </div>
      <p className="mt-1 text-right text-xs text-encre/50">Hors frais de livraison</p>

      <Link
        href="/commande"
        className="mt-8 block rounded-full bg-lueur px-8 py-3 text-center text-sm font-medium text-encre transition hover:bg-lueur/90"
      >
        Passer la commande
      </Link>

      {/* The basket is a collecting step again, not a dead end — without a way
          back to the shop, a basket reads as somewhere you are stuck rather
          than somewhere you are still choosing. */}
      <p className="mt-5 text-center text-sm">
        <Link
          href="/boutique"
          className="text-encre/60 underline transition hover:text-encre"
        >
          ← Continuer mes achats
        </Link>
      </p>
    </main>
  );
}
