"use client";

import Image from "next/image";
import type { FeaturedProduct } from "@/lib/products";
import { LampMark } from "@/components/LampMark";

// The hero IS the choice: shape, then coloris, then the price and the button.
// The old hero showed a lamp and sent you elsewhere to pick one; this one lets
// the visitor do on the homepage exactly what they will do to order.
//
// Only the SELECTED photograph is rendered. The mock-up kept all forty-one in
// the page because its runtime could not swap a src; here it can, and that
// matters: forty-one requests per visit is what put the shop's Supabase over
// its egress quota in September.
export function Configurateur({
  produits,
  p,
  c,
  nuit,
  onForme,
  onCouleur,
  onNuit,
  fond,
  encre,
  encreDouce,
  bord,
}: {
  produits: FeaturedProduct[];
  p: number;
  c: number;
  nuit: boolean;
  onForme: (i: number) => void;
  onCouleur: (i: number) => void;
  onNuit: () => void;
  fond: string;
  encre: string;
  encreDouce: string;
  bord: string;
}) {
  const produit = produits[p];
  const coloris = produit?.colors[c] ?? produit?.colors[0];
  const photo = coloris?.photoUrl ?? produit?.photoUrl ?? null;





  if (!produit || !coloris) return null;

  return (
    <div
      id="composer"
      className="rounded-b-[3.5rem] transition-colors duration-700"
      style={{ background: fond }}
    >

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-12 lg:flex-row lg:items-center lg:gap-6 lg:pb-12">
        <div className="lg:w-[500px] lg:shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="naja-monte inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier sm:text-[15px]">
              {produits.length} formes · {produits.reduce((n, x) => n + x.colors.length, 0)} coloris
            </span>
            <button
              type="button"
              onClick={onNuit}
              className="cursor-pointer rounded-full border-[3px] px-4 py-2 font-heading text-[13px] transition active:scale-95 sm:text-[15px]"
              style={{ color: encre, borderColor: bord }}
            >
              {nuit ? "☀ Le jour" : "☾ Voir la nuit"}
            </button>
          </div>
          <h1
            className="naja-monte mt-3 font-heading text-[60px] leading-[.86] font-bold tracking-[-.03em] sm:text-[76px]"
            style={{ color: encre, animationDelay: ".08s" }}
          >
            {produit.name.toLowerCase()}
          </h1>
          <p
            className="naja-monte mt-1.5 font-heading text-[27px] font-semibold sm:text-3xl"
            style={{ color: encre, animationDelay: ".16s" }}
          >
            en{" "}
            <span
              key={`${p}-${c}`}
              className="naja-pop inline-block"
              style={{
                color: coloris.colorHex ?? "#e5d9cf",
                WebkitTextStroke: `2.5px ${nuit ? "#fffdf7" : "#241c21"}`,
              }}
            >
              {coloris.colorName.toLowerCase()}
            </span>
            .
          </p>

          <p
            className="mt-5 text-[13px] font-semibold tracking-[.1em] uppercase"
            style={{ color: encreDouce }}
          >
            1 · la forme
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {produits.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => onForme(i)}
                aria-pressed={i === p}
                className="naja-monte cursor-pointer rounded-full border-[3px] px-4 py-2.5 font-heading text-base transition active:translate-y-1 active:scale-[.97]"
                // De nuit, la sélection s'inverse : un bouton encre sur un
                // fond encre ne se voit pas. C'est la forme choisie, elle doit
                // être la plus lisible des sept.
                style={{
                  animationDelay: `${0.24 + i * 0.035}s`,
                  ...(i === p
                    ? nuit
                      ? { background: "#fffdf7", color: "#241c21", borderColor: "#fffdf7" }
                      : { background: "#241c21", color: "#fffdf7", borderColor: "#241c21" }
                    : { background: "transparent", color: encre, borderColor: bord }),
                }}
              >
                {x.name}
              </button>
            ))}
          </div>

          <p
            className="mt-5 text-[13px] font-semibold tracking-[.1em] uppercase"
            style={{ color: encreDouce }}
          >
            2 · la couleur — {produit.colors.length} coloris
          </p>
          <div key={p} className="mt-2 flex flex-wrap gap-2.5">
            {produit.colors.map((col, i) => (
              <button
                key={col.id}
                type="button"
                onClick={() => onCouleur(i)}
                disabled={!col.inStock}
                aria-label={col.inStock ? col.colorName : `${col.colorName} (rupture)`}
                title={col.inStock ? col.colorName : `${col.colorName} (rupture)`}
                aria-pressed={i === c}
                // The same lamp the admin and the product pages draw. A flat
                // disc here would have been the only place on the site where a
                // bicolour variant loses its second hue, and the shape is what
                // says WHERE each hue goes: shade above, base below.
                //
                // 52px: this is a thumb on a phone, not a mouse.
                className={`naja-pop relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-papier transition active:scale-110 ${
                  col.inStock ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  animationDelay: `${0.3 + i * 0.022}s`,
                  border:
                    i === c
                      ? `4px solid ${nuit ? "#fffdf7" : "#241c21"}`
                      : `3px solid ${bord}`,
                }}
              >
                <LampMark hex={col.colorHex} hex2={col.colorHex2} className="h-9 w-9" />

                {/* Out of stock reads as a struck-through mark, so it is not
                    carried by the faded opacity alone. */}
                {!col.inStock ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto h-[1.5px] w-9 rotate-45 rounded-full bg-encre/70"
                  />
                ) : null}
              </button>
            ))}
          </div>

          <a
            href="#comment"
            className="mt-6 flex items-center justify-between rounded-full bg-encre px-6 py-4 font-heading text-lg text-papier shadow-[0_7px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none sm:text-xl"
          >
            <span>Je la veux comme ça</span>
            <span>{produit.price.toLocaleString("fr-FR")} DA</span>
          </a>
        </div>

        <div className="relative flex h-[330px] flex-grow items-center justify-center lg:h-[520px]">
          <div
            aria-hidden
            className="absolute h-[330px] w-[330px] rounded-full transition-opacity duration-700 lg:h-[520px] lg:w-[520px]"
            style={{
              opacity: nuit ? 1 : 0,
              background:
                "radial-gradient(circle, rgba(255,196,110,.6) 0%, rgba(255,196,110,.2) 45%, rgba(23,19,26,0) 70%)",
            }}
          />
          {photo ? (
            <Image
              key={photo}
              src={photo}
              alt={`Veilleuse ${produit.name}, coloris ${coloris.colorName}`}
              width={520}
              height={520}
              priority
              quality={85}
              sizes="(min-width: 1024px) 470px, 300px"
              className="naja-photo relative h-[300px] w-[300px] object-contain lg:h-[470px] lg:w-[470px]"
            />
          ) : (
            <p className="text-sm" style={{ color: encreDouce }}>
              Photo à venir pour ce coloris.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
