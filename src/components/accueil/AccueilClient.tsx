"use client";

import { useRef, useState } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { inkOn, pale } from "@/lib/accueil";
import { Configurateur } from "@/components/accueil/Configurateur";
import { Etapes } from "@/components/accueil/Etapes";
import { Faq } from "@/components/site/Faq";
import { FondDoux } from "@/components/accueil/FondDoux";
import { Retours } from "@/components/accueil/Retours";
import { Test } from "@/components/accueil/Test";
import { useReveal } from "@/components/accueil/useReveal";

const BANDEAU = ["PAYEZ À LA LIVRAISON", "58 WILAYAS", "IMPRIMÉE POUR VOUS", "AUCUN ACOMPTE"];

// One state tree for the whole page: the chosen coloris tints every section,
// and the night switch darkens all of it at once. Splitting the state per
// section would have meant the page agreeing with itself only by accident.
export function AccueilClient({ produits }: { produits: FeaturedProduct[] }) {
  const [p, setP] = useState(0);
  const [c, setC] = useState(0);
  const [nuit, setNuit] = useState(false);
  const zoneBasse = useRef<HTMLDivElement>(null);

  // Tout ce qui suit le bandeau monte à l'arrivée dans l'écran.
  useReveal(zoneBasse, "[data-apparait]");

  const produit = produits[p];
  const coloris = produit?.colors[c] ?? produit?.colors[0];

  const fond = nuit ? "#17131a" : pale(coloris?.colorHex ?? null);
  const encre = nuit ? "#fffdf7" : inkOn(fond);
  const encreDouce = nuit ? "rgba(255,253,247,.72)" : "rgba(36,28,33,.72)";
  const bord = nuit ? "rgba(255,253,247,.38)" : "rgba(36,28,33,.24)";

  if (!produit || !coloris) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <p className="text-center text-lg text-encre/70">
          Les premières veilleuses arrivent très bientôt — repassez par ici.
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen transition-colors duration-700"
      style={{ background: nuit ? "#17131a" : "var(--papier)" }}
    >
      <Configurateur
        produits={produits}
        p={p}
        c={c}
        nuit={nuit}
        onForme={(i) => {
          setP(i);
          setC(0);
        }}
        onCouleur={setC}
        onNuit={() => setNuit((v) => !v)}
        fond={fond}
        encre={encre}
        encreDouce={encreDouce}
        bord={bord}
      />

      <div className="overflow-hidden bg-encre py-4 whitespace-nowrap text-papier">
        <div className="inline-block animate-[naja-defile_18s_linear_infinite] font-heading text-base sm:text-xl">
          {[...BANDEAU, ...BANDEAU].map((t, i) => (
            <span key={`${t}-${i}`}>
              <span className="px-4 sm:px-6">{t}</span>
              <span className="px-4 text-lueur sm:px-6">●</span>
            </span>
          ))}
        </div>
      </div>

      <div ref={zoneBasse} className="relative">
        <FondDoux teinte={pale(coloris?.colorHex ?? null)} nuit={nuit} />

        <Etapes encre={encre} encreDouce={encreDouce} />

      <Test
        produits={produits}
        encre={encre}
        encreDouce={encreDouce}
        onChoisir={(np, nc) => {
          setP(np);
          setC(nc);
        }}
      />

      <Retours encre={encre} encreDouce={encreDouce} bord={bord} />

        <div data-apparait>
          <Faq />
        </div>

        <div
          data-apparait
          className="mx-5 mt-12 rounded-[2.75rem] border-4 border-encre p-8 transition-colors duration-700 sm:mx-12 sm:p-12"
          style={{ background: fond }}
        >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="font-heading text-[36px] leading-none font-bold tracking-[-.02em] sm:text-5xl"
              style={{ color: encre }}
            >
              Laquelle sera la vôtre ?
            </h2>
            <p className="mt-3 text-base font-medium sm:text-lg" style={{ color: encreDouce }}>
              Deux minutes, sans compte. Vous payez au livreur.
            </p>
          </div>
          <a
            href="#composer"
            className="shrink-0 rounded-full bg-encre px-8 py-4 text-center font-heading text-lg text-papier shadow-[0_8px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none sm:text-xl"
          >
            Composer ma veilleuse
          </a>
        </div>
      </div>

        <p className="px-5 py-10 text-center text-sm font-medium sm:px-12" style={{ color: encreDouce }}>
          fait main en Algérie · paiement à la livraison
        </p>
      </div>
    </main>
  );
}
