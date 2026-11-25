"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { inkOn, pale } from "@/lib/accueil";
import { horlogePourSlug } from "@/lib/horloges";
import type { FeaturedProduct, FilamentColor } from "@/lib/products";

// Le bloc « nouveau : les horloges » sur l'accueil.
//
// ── Ce que cette page sait déjà faire, et pourquoi on le refait ici ─────
//
// L'accueil EST un configurateur : on choisit une forme, une couleur, et la
// page entière prend la teinte de la lampe qu'on regarde. Ça marche sur des
// PHOTOGRAPHIES, une par coloris, préchargées. Une horloge n'a pas de photo —
// elle a près de deux millions de combinaisons — et ne peut donc pas entrer
// dans ce mécanisme-là.
//
// Mais c'est le bon geste, et la cliente l'a déjà appris vingt centimètres
// plus haut. Alors on le refait, avec ce que l'horloge a : cinq rendus figés,
// tirés du modèle 3D lui-même, dans cinq combinaisons de ses vraies bobines.
// On touche une pastille, l'horloge change, le bloc change de couleur.
//
// ── Pourquoi des images et pas la 3D ────────────────────────────────────
//
// Parce que c'est l'accueil. Démarrer un moteur 3D et télécharger 740 Ko de
// modèle pour toutes les visiteuses, y compris celles qui viennent pour une
// veilleuse, se paierait en secondes d'attente sur la page qui reçoit la
// publicité. Cinq images de trente kilos, dont une seule est chargée au
// départ, disent la même chose. La vraie 3D attend sur la fiche, à un clic,
// là où quelqu'un a décidé de regarder cet objet-là.

export function BandeauHorloges({
  horloges,
  palette,
}: {
  horloges: FeaturedProduct[];
  // La palette réelle, lue en base : les pastilles montrent les teintes que
  // la patronne a effectivement en bobine, pas une copie figée dans le code.
  palette: FilamentColor[];
}) {
  // La première horloge qui a des rendus. S'il n'y en a aucune — produit
  // retiré, images pas encore faites — le bloc ne s'affiche pas du tout,
  // plutôt que de laisser un cadre vide sur l'accueil.
  const produit = horloges.find((h) => {
    const horloge = horlogePourSlug(h.slug);
    return horloge?.idees.some((i) => i.image);
  });
  const horloge = produit ? horlogePourSlug(produit.slug) : null;
  const idees = horloge?.idees.filter((i) => i.image) ?? [];

  const [choisie, setChoisie] = useState(0);

  if (!produit || !horloge || idees.length === 0) return null;

  const idee = idees[Math.min(choisie, idees.length - 1)];
  const hex = (slot: string) =>
    palette.find((c) => c.name === idee.couleurs[slot])?.hex ??
    horloge.vitrine[slot] ??
    "#cccccc";

  // Le bloc prend la couleur de l'horloge qu'on regarde, exactement comme la
  // page prend celle de la lampe qu'on regarde. L'encre se recalcule dessus :
  // sur un fond jaune pâle il faut du noir, sur un violet pâle aussi, et le
  // jour où une bobine très sombre arrive, la règle tient toute seule.
  const fond = pale(hex(horloge.teinteSlot));
  const encre = inkOn(fond);
  const encreDouce = encre === "#241c21" ? "rgba(36,28,33,.72)" : "rgba(255,253,247,.78)";

  return (
    <section data-apparait className="mx-5 mt-14 sm:mx-12">
      <div
        className="overflow-hidden rounded-[2.75rem] border-4 border-encre transition-colors duration-700"
        style={{ background: fond }}
      >
        <div className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* ── L'horloge ────────────────────────────────────────────── */}
          <div className="relative order-1 aspect-square w-full lg:order-none">
            {idees.map((i, index) => (
              // Toutes les images sont dans le DOM, une seule est opaque :
              // l'échange est alors instantané et sans clignotement. Seule
              // la première est `priority` ; les autres arrivent quand le
              // navigateur a mieux à faire, ou au premier doigt.
              <Image
                key={i.nom}
                src={i.image!}
                alt={`${produit.name} — ${i.nom}`}
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                priority={index === 0}
                className={`object-contain transition-opacity duration-500 ${
                  index === choisie ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>

          {/* ── Ce qu'on en dit ──────────────────────────────────────── */}
          <div className="order-2 px-6 pb-8 lg:order-none lg:px-0 lg:pr-10 lg:pb-0">
            <span className="inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier">
              Nouveau
            </span>
            <h2
              className="mt-3 font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]"
              style={{ color: encre }}
            >
              L&apos;horloge
              <br />
              {produit.name.replace(/^horloge\s+/i, "").toLowerCase()}.
            </h2>
            <p
              className="mt-3 max-w-[420px] text-base font-medium sm:text-lg"
              style={{ color: encreDouce }}
            >
              Double face : elle se fixe au mur par le côté et donne l&apos;heure des
              deux bouts du couloir. Vous choisissez la couleur de chaque pièce.
            </p>

            {/* ── Les coloris ────────────────────────────────────────── */}
            <div className="mt-6 flex flex-wrap gap-2">
              {idees.map((i, index) => {
                const actif = index === choisie;
                const points = [i.couleurs[horloge.teinteSlot], i.couleurs.heures]
                  .map((nom) => palette.find((c) => c.name === nom)?.hex)
                  .filter((h): h is string => Boolean(h));
                return (
                  <button
                    key={i.nom}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setChoisie(index)}
                    className={`flex min-h-11 items-center gap-2 rounded-full px-3.5 font-heading text-[14px] font-semibold transition active:scale-95 ${
                      actif
                        ? "border-2 border-encre bg-encre text-papier"
                        : "border-2 border-encre/25 bg-papier/80 text-encre hover:border-encre/60"
                    }`}
                  >
                    <span className="flex">
                      {points.map((h, k) => (
                        <span
                          key={k}
                          className="h-4 w-4 rounded-full border border-encre/25"
                          style={{ background: h, marginLeft: k === 0 ? 0 : -6 }}
                        />
                      ))}
                    </span>
                    {i.nom}
                  </button>
                );
              })}
            </div>

            <p
              className="mt-6 font-heading text-[28px] leading-none font-bold"
              style={{ color: encre }}
            >
              {produit.price.toLocaleString("fr-FR")} DA
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: encreDouce }}>
              Imprimée à votre commande · vous payez au livreur
            </p>

            <Link
              href={`/boutique/${produit.slug}`}
              className="mt-5 inline-block rounded-full bg-encre px-7 py-4 font-heading text-lg text-papier shadow-[0_8px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
            >
              Composer la mienne
            </Link>
            <p className="mt-2 text-[13px]" style={{ color: encreDouce }}>
              Tournez-la en 3D sur sa fiche.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
