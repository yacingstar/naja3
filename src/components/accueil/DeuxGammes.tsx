"use client";

import Image from "next/image";
import Link from "next/link";
import { horlogePourSlug } from "@/lib/horloges";
import type { FeaturedProduct } from "@/lib/products";

// Les deux portes de la maison, en haut de l'accueil.
//
// ── Pourquoi deux portes plutôt qu'une page qui commence par un produit ──
//
// Jusqu'ici l'accueil s'ouvrait sur UNE chose : d'abord le configurateur de
// veilleuses, puis — pendant une journée — l'horloge. Dans les deux cas, la
// moitié du catalogue était invisible au premier écran, et la cliente qui
// venait pour l'autre moitié devait deviner qu'elle existait.
//
// Naja vend maintenant deux gammes. Le premier écran dit donc les deux, côte
// à côte, à la même taille : on choisit sa porte, et ce qu'il y a derrière
// commence juste en dessous. Tout le reste de la page — le configurateur de
// veilleuses, les étapes, les avis — est inchangé.
//
// ── Côte à côte même sur un téléphone ───────────────────────────────────
//
// Deux cartes empilées feraient deux écrans, et la seconde gamme serait de
// nouveau cachée : exactement le défaut qu'on corrige. Elles tiennent donc
// sur une ligne à toutes les largeurs, quitte à être petites — une vignette
// qu'on voit vaut mieux qu'une grande qu'il faut aller chercher.

// Les deux fonds viennent de la palette du site (voir CarteProduit) : le
// jaune pour les veilleuses, qui sont des lampes, le bleu pour les horloges,
// qui sont bleues.
const FOND_VEILLEUSES = "#ffd166";
const FOND_HORLOGES = "#7fd4ee";

export function DeuxGammes({
  produits,
  horloges,
}: {
  produits: FeaturedProduct[];
  horloges: FeaturedProduct[];
}) {
  const lampe = produits[0];
  // La première horloge qui a un rendu : sans image, pas de porte — mieux
  // vaut une seule gamme montrée qu'un cadre vide à côté d'elle.
  const horloge = horloges.find((h) => {
    const forme = horlogePourSlug(h.slug);
    return forme?.idees.some((i) => i.image);
  });
  const forme = horloge ? horlogePourSlug(horloge.slug) : null;
  const imageHorloge = forme?.idees.find((i) => i.image)?.image;

  if (!lampe) return null;

  const prixMini = Math.min(...produits.map((p) => p.price));
  const coloris = produits.reduce((n, p) => n + p.colors.length, 0);

  return (
    <section className="mx-5 mt-5 sm:mx-12 sm:mt-8">
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[60px]">
        Veilleuses <span className="text-encre/35">&</span> horloges.
      </h1>
      <p className="mt-2 max-w-[560px] text-base font-medium text-encre/72 sm:text-lg">
        Imprimées en 3D à Alger, après votre commande, dans les couleurs que vous
        choisissez. Vous payez au livreur.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-6">
        <Porte
          href="#composer"
          fond={FOND_VEILLEUSES}
          titre="les veilleuses"
          prix={`à partir de ${prixMini.toLocaleString("fr-FR")} DA`}
          detail={`${produits.length} formes · ${coloris} coloris`}
        >
          {lampe.photoUrl ? (
            <Image
              src={lampe.photoUrl}
              alt="Veilleuse Naja"
              fill
              sizes="(min-width: 640px) 40vw, 45vw"
              priority
              className="object-contain p-2 transition duration-300 group-hover:scale-105"
            />
          ) : null}
        </Porte>

        {horloge && imageHorloge ? (
          <Porte
            href="/horloges"
            fond={FOND_HORLOGES}
            titre="les horloges"
            prix={`${horloge.price.toLocaleString("fr-FR")} DA`}
            detail={`${forme?.zones.length ?? 0} pièces à composer`}
            nouveau
          >
            <Image
              src={imageHorloge}
              alt={horloge.name}
              fill
              sizes="(min-width: 640px) 40vw, 45vw"
              priority
              className="object-contain transition duration-300 group-hover:scale-105"
            />
          </Porte>
        ) : null}
      </div>
    </section>
  );
}

function Porte({
  href,
  fond,
  titre,
  prix,
  detail,
  nouveau,
  children,
}: {
  href: string;
  fond: string;
  titre: string;
  prix: string;
  detail: string;
  nouveau?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[1.75rem] border-4 border-encre p-3 transition-shadow duration-300 hover:shadow-[0_20px_38px_-20px_rgba(36,28,33,.5)] sm:rounded-[2.25rem] sm:p-5"
      style={{ background: fond }}
    >
      {/* Carrée sur un téléphone, mais plafonnée en hauteur dès `sm` :
          deux carrés côte à côte sur un écran large font deux images de
          450 pixels de haut, et le nom de la gamme passe sous la ligne de
          flottaison — le premier écran ne dirait plus ce qu'on vend. */}
      <span className="relative block aspect-square w-full sm:aspect-auto sm:h-[250px]">
        {children}
        {nouveau ? (
          <span className="absolute top-0 left-0 rounded-full bg-encre px-2.5 py-1 font-heading text-[11px] text-papier sm:text-[13px]">
            Nouveau
          </span>
        ) : null}
      </span>
      <span className="mt-2 block font-heading text-[21px] leading-none font-bold text-encre sm:text-[30px]">
        {titre}
      </span>
      <span className="mt-1 block font-heading text-[14px] text-encre/80 sm:text-base">
        {prix}
      </span>
      <span className="mt-1.5 block text-[11px] font-semibold tracking-[.05em] text-encre/60 uppercase sm:text-[13px]">
        {detail}
      </span>
    </Link>
  );
}
