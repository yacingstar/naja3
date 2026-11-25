"use client";

import { useRef } from "react";
import { CarteProduit } from "@/components/boutique/CarteProduit";
import { FondDoux } from "@/components/accueil/FondDoux";
import { useReveal } from "@/components/accueil/useReveal";
import type { FeaturedProduct } from "@/lib/products";

// La rubrique « Horloges ».
//
// Une page à part et non un filtre sur la boutique, parce que ce n'est pas le
// même achat : une veilleuse se choisit sur sa forme et sa couleur, une
// horloge se compose pièce par pièce. Les clientes qui arrivent d'une publi-
// cité pour les horloges doivent tomber sur les horloges, pas sur dix
// veilleuses parmi lesquelles en chercher deux.
//
// Les fiches restent sous /boutique/<slug> : c'est là que le Duo vit depuis
// novembre, les liens partagés et ce que Google connaît pointent là, et une
// adresse qui change est une adresse qu'on casse.

export function HorlogesClient({ produits }: { produits: FeaturedProduct[] }) {
  const zone = useRef<HTMLDivElement>(null);
  useReveal(zone, "[data-apparait]");

  if (produits.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-12">
        <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] sm:text-[56px]">
          Les horloges.
        </h1>
        <p className="mt-4 text-lg font-medium text-encre/70">
          Elles arrivent très bientôt — repassez par ici.
        </p>
      </main>
    );
  }

  return (
    <main ref={zone} className="relative px-5 pt-10 pb-16 sm:px-12 sm:pt-14">
      <FondDoux teinte="rgba(150,190,255,.22)" nuit={false} />

      <div data-apparait>
        <span className="inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier sm:text-[15px]">
          Nouveau · composez la vôtre
        </span>
        {/* Le titre ne se lève pas mot par mot comme celui de la boutique : la
            page en contient peu, et une animation d'entrée sur deux mots se
            remarque plus qu'elle ne sert. */}
        <h1 className="mt-3 font-heading text-[48px] leading-[.9] font-bold tracking-[-.03em] sm:text-[72px]">
          Les horloges.
        </h1>
        <p className="mt-3 max-w-[640px] text-base font-medium text-encre/72 sm:text-lg">
          Chacune s&apos;imprime pièce par pièce, dans les couleurs que vous choisissez.
          Tournez-la du doigt sur sa fiche : ce que vous voyez est celle qui sortira de
          l&apos;imprimante. Vous payez au livreur.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {produits.map((p, i) => (
          <CarteProduit key={p.id} produit={p} index={i} />
        ))}
      </div>
    </main>
  );
}
