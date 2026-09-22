"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { hue, inkOn } from "@/lib/accueil";

const QUESTIONS = [
  { t: "Elle ira dans quelle pièce ?", r: ["Une chambre", "Un salon", "Un bureau"] },
  { t: "Vous cherchez quelle ambiance ?", r: ["Douce et calme", "Chaleureuse", "Vive et gaie"] },
  { t: "Et côté couleur ?", r: ["Plutôt chaude", "Plutôt fraîche", "Douce et claire"] },
];

// Room × mood picks the shape; the colour answer then picks a coloris that the
// shape ACTUALLY has, in stock first. Every route therefore lands on a pair
// that can really be ordered — a recommendation you cannot buy is worse than
// no recommendation.
const FORMES: string[][] = [
  ["Champignon", "Akari", "nomura"],
  ["Japandi", "nomura", "Origami"],
  ["Capricorne", "Nami", "nomura"],
];

const POURQUOI = [
  "Pour une chambre, on cherche une lumière basse qui ne réveille personne.",
  "Dans un salon, elle doit tenir sa place le soir sans éclairer comme un plafonnier.",
  "Sur un bureau, elle éclaire sans fatiguer les yeux au bout de deux heures.",
];

export function Test({
  produits,
  encre,
  encreDouce,
  onChoisir,
}: {
  produits: FeaturedProduct[];
  encre: string;
  encreDouce: string;
  /** Feeds the answer back up to the configurator, so the hero shows it too. */
  onChoisir: (p: number, c: number) => void;
}) {
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<number[]>([]);
  const boutons = useRef<HTMLDivElement>(null);

  const fini = etape >= QUESTIONS.length;

  useEffect(() => {
    if (fini) return;
    let annule = false;
    import("gsap").then(({ gsap }) => {
      if (annule || !boutons.current) return;
      gsap.fromTo(
        boutons.current.children,
        { x: -22 },
        { x: 0, duration: 0.35, stagger: 0.07, ease: "power3.out", overwrite: true },
      );
    });
    return () => {
      annule = true;
    };
  }, [etape, fini]);

  function recommandation() {
    const nom = FORMES[reponses[0] ?? 0][reponses[1] ?? 0];
    const p = Math.max(0, produits.findIndex((x) => x.name === nom));
    const produit = produits[p];
    const pool = produit.colors.some((x) => x.inStock)
      ? produit.colors.map((c, i) => ({ c, i })).filter((x) => x.c.inStock)
      : produit.colors.map((c, i) => ({ c, i }));
    // -1 = "douce et claire": we want the least saturated, so we score by
    // distance from the pale end rather than from a hue.
    const cible = reponses[2] === 1 ? 200 : reponses[2] === 2 ? -1 : 25;
    let meilleur = pool[0];
    let ecart = Infinity;
    for (const x of pool) {
      const h = hue(x.c.colorHex);
      const d =
        cible < 0
          ? h < 0
            ? 0
            : 200 - Math.min(200, Math.abs(h - 330))
          : h < 0
            ? 400
            : Math.min(Math.abs(h - cible), 360 - Math.abs(h - cible));
      if (d < ecart) {
        ecart = d;
        meilleur = x;
      }
    }
    return { p, c: meilleur.i };
  }

  const reco = fini ? recommandation() : null;
  const produit = reco ? produits[reco.p] : null;
  const coloris = reco && produit ? produit.colors[reco.c] : null;
  const photo = coloris?.photoUrl ?? produit?.photoUrl ?? null;

  function repondre(i: number) {
    setReponses((r) => [...r, i]);
    setEtape((e) => e + 1);
  }

  function recommencer() {
    setReponses([]);
    setEtape(0);
  }

  return (
    <div className="px-5 pt-12 sm:px-12 sm:pt-16">
      <h2
        data-apparait
        className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] sm:text-[54px]"
        style={{ color: encre }}
      >
        Vous hésitez ? Trois questions.
      </h2>
      <p className="mt-3 max-w-[700px] text-base font-medium sm:text-lg" style={{ color: encreDouce }}>
        On vous dit laquelle est faite pour vous — la forme et la couleur.
      </p>

      <div data-apparait className="mt-6 min-h-[400px] rounded-[2.25rem] border-4 border-encre bg-papier p-6 text-encre sm:p-9">
        {!fini ? (
          <>
            <div className="flex gap-2">
              {QUESTIONS.map((_, k) => (
                <span
                  key={k}
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: k === etape ? 32 : 12,
                    background: k <= etape ? "#241c21" : "rgba(36,28,33,.18)",
                  }}
                />
              ))}
            </div>
            <p className="mt-5 font-heading text-[30px] leading-tight font-semibold sm:text-[38px]">
              {QUESTIONS[etape].t}
            </p>
            <div ref={boutons} className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3.5">
              {QUESTIONS[etape].r.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => repondre(i)}
                  className="cursor-pointer rounded-full border-[3px] border-encre px-6 py-4 text-left font-heading text-lg transition hover:-translate-y-0.5 hover:bg-[#ffd166] active:translate-y-1 sm:text-xl"
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          produit &&
          coloris && (
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-9">
              <div className="relative h-[230px] w-full shrink-0 lg:h-[300px] lg:w-[300px]">
                {photo ? (
                  <Image
                    src={photo}
                    alt={`Veilleuse ${produit.name}, coloris ${coloris.colorName}`}
                    fill
                    quality={85}
                    sizes="(min-width: 1024px) 300px, 100vw"
                    className="object-contain"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-[13px] font-semibold tracking-[.1em] text-encre/60 uppercase">
                  Elle est faite pour vous
                </p>
                <p className="mt-1.5 font-heading text-[42px] leading-[.95] font-bold tracking-[-.02em] sm:text-[52px]">
                  {produit.name.toLowerCase()}
                </p>
                <p className="mt-0.5 font-heading text-[25px] font-semibold sm:text-3xl">
                  en{" "}
                  <span
                    className="inline-block rounded-2xl border-2 px-3 py-0.5"
                    style={{
                      background: coloris.colorHex ?? "#e5d9cf",
                      color: inkOn(coloris.colorHex ?? "#e5d9cf"),
                      borderColor: "rgba(36,28,33,.22)",
                    }}
                  >
                    {coloris.colorName.toLowerCase()}
                  </span>
                  .
                </p>
                <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed font-medium text-encre/75 sm:text-base">
                  {POURQUOI[reponses[0] ?? 0]}
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      onChoisir(reco!.p, reco!.c);
                      document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="cursor-pointer rounded-full bg-encre px-7 py-4 font-heading text-lg text-papier shadow-[0_7px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none sm:text-xl"
                  >
                    Je la commande · {produit.price.toLocaleString("fr-FR")} DA
                  </button>
                  <button
                    type="button"
                    onClick={recommencer}
                    className="cursor-pointer rounded-full border-[3px] border-encre/25 px-5 py-3 font-heading text-base transition active:translate-y-0.5"
                  >
                    Refaire le test
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
