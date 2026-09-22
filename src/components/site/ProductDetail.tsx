"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DirectOrderForm } from "@/components/site/DirectOrderForm";
import { ColorSwatches } from "@/components/site/ColorSwatches";
import { ProductStage, type StageView } from "@/components/site/ProductStage";
import { useReveal } from "@/components/accueil/useReveal";
import { inkOn, pale } from "@/lib/accueil";
import { trackViewContent } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import { formatPrice } from "@/lib/format";
import type { ProductColorDetail } from "@/lib/products";

type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  price: number;
  description: string;
};

// Reassurance repeated from the homepage's trust strip. Deliberate
// duplication: a customer landing straight on a product page from a
// shared link never sees the homepage, and "do I pay now or on delivery?"
// is the question that decides whether they fill the order form at all.
//
// Drawn as coloured pills now, in the register of the new homepage and shop,
// and moved ABOVE the form: these three lines answer the objections that stop
// somebody filling it in, so they have to be read before it, not after.
const REASSURANCE = [
  { texte: "Paiement à la livraison", fond: "#ffd166" },
  { texte: "Imprimée à la commande", fond: "#8ad4c1" },
  { texte: "Emballée à la main", fond: "#ff9ec7" },
];

// One client component owns the whole two-column layout, rather than a
// gallery component per column. Colour selection drives the photo, the
// thumbnails AND the order, so a single state owner avoids lifting that
// selection through the server page.
//
// The buying half of this file now lives in DirectOrderForm — the page takes
// the order inline instead of adding to a cart (see that file for why).
// Colour selection stays here rather than moving down with it, because the
// photo on the left depends on it too; the form receives it as a controlled
// value.
export function ProductDetail({
  product,
  colors,
  rates,
}: {
  product: ProductSummary;
  colors: ProductColorDetail[];
  rates: DeliveryRate[];
}) {
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const zone = useRef<HTMLDivElement>(null);

  // Seuls les blocs de la colonne de droite sont marqués : la colonne de
  // gauche est en `sticky`, et une transformation GSAP sur un élément collant
  // le décroche de son conteneur.
  useReveal(zone, "[data-apparait]");

  // Colors come pre-sorted in-stock-first (see getProductBySlug), so the
  // default selection is always something a customer can actually buy.
  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];

  // Arrivée depuis le configurateur de l'accueil : #c<id> désigne le coloris
  // déjà choisi là-bas. Le fragment n'existe que dans le navigateur, donc il ne
  // peut être lu qu'après le montage — le lire pendant le rendu ferait diverger
  // le HTML du serveur et celui du client.
  //
  // C'est exactement ce pour quoi un effet existe : aligner l'état React sur un
  // système extérieur, ici l'URL. La règle vise les cascades de rendus ; celui-ci
  // s'exécute une fois au montage et ne se redéclenche jamais.
  useEffect(() => {
    const cible = Number(window.location.hash.replace("#c", ""));
    if (cible && colors.some((c) => c.id === cible)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedColorId(cible);
    }
  }, [colors]);

  // The cutout leads, with the real backdrop shots behind it. Two reasons
  // it goes first rather than replacing them: it's the view ProductStage
  // can actually light (no background of its own to fight), and it shows
  // the lamp's true silhouette, which is what someone is deciding on.
  // The photographed-in-a-room shots are still one tap away.
  const views: StageView[] = selectedColor
    ? [
        ...(selectedColor.cutoutPhotoUrl
          ? [{ kind: "cutout" as const, url: selectedColor.cutoutPhotoUrl }]
          : []),
        ...selectedColor.photos.map((p) => ({ kind: "photo" as const, url: p.url })),
      ]
    : [];
  const view = views[photoIndex] ?? views[0] ?? null;

  function selectColor(id: number) {
    setSelectedColorId(id);
    setPhotoIndex(0);
  }

  // ViewContent tells Meta which lamp was looked at and what it is worth —
  // the signal it uses to find people interested in this kind of product.
  useEffect(() => {
    trackViewContent({ id: product.slug, name: product.name, value: product.price });
  }, [product.slug, product.name, product.price]);

  // La teinte choisie déborde sur le cadre de la photo, comme sur l'accueil :
  // la page prend la couleur de la lampe qu'on est en train de regarder.
  const teinte = pale(selectedColor?.colorHex ?? null);

  return (
    <div ref={zone} className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
      {/* ── Left: the photo ─────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-28">
        <div
          className="mx-auto w-full max-w-lg rounded-[2.5rem] border-4 border-encre p-3 transition-colors duration-700 sm:p-4"
          style={{ background: teinte }}
        >
          {/* Keyed sur le coloris : changer de couleur remonte le bloc, donc
              l'animation d'entrée se rejoue. La photo « arrive » au lieu de se
              substituer silencieusement. */}
          <div key={selectedColor?.id ?? "vide"} className="naja-photo">
            <ProductStage
              view={view}
              alt={
                selectedColor
                  ? `${product.name} — ${selectedColor.colorName}`
                  : product.name
              }
              // Capped at max-w-lg (512px) on desktop; full column width
              // below that, since the grid collapses to one column.
              sizes="(min-width: 640px) 512px, 100vw"
            />
          </div>
        </div>

        {views.length > 1 ? (
          <div className="mt-5 flex justify-center gap-3">
            {views.map((v, index) => (
              <button
                key={v.url}
                type="button"
                onClick={() => setPhotoIndex(index)}
                aria-label={v.kind === "cutout" ? "La lampe seule" : `Photo ${index}`}
                aria-current={index === photoIndex}
                className={`naja-pop h-16 w-16 overflow-hidden rounded-2xl bg-papier transition active:scale-95 ${
                  index === photoIndex
                    ? "border-[3px] border-encre"
                    : "border-2 border-encre/15 hover:border-encre/40"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Image
                  src={v.url}
                  alt=""
                  width={64}
                  height={64}
                  sizes="64px"
                  quality={85}
                  // contain for the cutout (cover would crop the lamp out
                  // of its own transparent margins), cover for real photos.
                  className={`h-full w-full ${
                    v.kind === "cutout" ? "object-contain p-1" : "object-cover"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
        {/* Colour sits here, under the photo, rather than down in the order
            slip: you pick a colour by looking at the lamp, and each colour
            swaps the photo above. Keeping the two a screen apart made you
            choose blind. The form is told not to repeat the step. */}
        {colors.length > 0 ? (
          <div className="mt-7">
            <p className="text-center font-heading text-lg font-semibold">
              Choisissez la couleur
            </p>
            <ColorSwatches
              colors={colors}
              selectedColorId={selectedColor?.id}
              onSelectColor={selectColor}
              centered
              className="mt-3"
            />
          </div>
        ) : null}

      </div>

      {/* ── Right: everything you decide with ───────────────────────── */}
      <div>
        <nav aria-label="Fil d'Ariane" className="text-sm text-encre/50">
          <Link href="/boutique" className="transition hover:text-encre">
            Boutique
          </Link>
          <span aria-hidden> / </span>
          <span className="text-encre/70">{product.name}</span>
        </nav>

        <div data-apparait>
          <span className="mt-5 inline-block rounded-full bg-encre px-4 py-2 font-heading text-[13px] text-papier">
            imprimée après votre commande
          </span>
          <h1 className="mt-3 font-heading text-[46px] leading-[.9] font-bold tracking-[-.03em] sm:text-[58px]">
            {product.name.toLowerCase()}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-heading text-[30px] leading-none font-bold text-encre">
              {formatPrice(product.price)}
            </span>
            {/* Le coloris choisi, écrit sur sa propre couleur — même pastille
                que dans le configurateur de l'accueil. L'encre est calculée
                pour rester lisible sur un jaune comme sur un bleu nuit. */}
            {selectedColor ? (
              <span
                key={selectedColor.id}
                className="naja-pop inline-block rounded-2xl border-2 px-3 py-1 font-heading text-[15px]"
                style={{
                  background: selectedColor.colorHex ?? "#e5d9cf",
                  color: inkOn(selectedColor.colorHex ?? "#e5d9cf"),
                  borderColor: "rgba(36,28,33,.22)",
                }}
              >
                {selectedColor.colorName}
              </span>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-5 max-w-prose leading-relaxed whitespace-pre-line text-encre/75">
              {product.description}
            </p>
          ) : null}
        </div>

        <ul data-apparait className="mt-6 flex flex-wrap gap-2">
          {REASSURANCE.map((r, i) => (
            <li
              key={r.texte}
              className="naja-pop rounded-full border-2 border-encre px-3.5 py-1.5 text-[13px] font-semibold text-encre"
              style={{ background: r.fond, animationDelay: `${i * 0.06}s` }}
            >
              {r.texte}
            </li>
          ))}
        </ul>

        <div data-apparait>
          {selectedColor ? (
            <DirectOrderForm
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
              }}
              colors={colors}
              selectedColorId={selectedColor.id}
              onSelectColor={selectColor}
              showColorStep={false}
              rates={rates}
            />
          ) : (
            <p className="mt-8 text-sm text-encre/60">
              Cette lampe n&apos;a pas encore de coloris en ligne — repassez très bientôt.
            </p>
          )}
        </div>

        <p className="mt-5 text-sm">
          <Link
            href="/#comment"
            className="text-encre/60 underline transition hover:text-encre"
          >
            Comment cette lampe est fabriquée
          </Link>
        </p>
      </div>
    </div>
  );
}
