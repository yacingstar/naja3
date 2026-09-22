"use client";

import Image from "next/image";
import Link from "next/link";
import type { FeaturedProduct } from "@/lib/products";
import { LampMark } from "@/components/LampMark";

// La carte du nouveau registre : bloc de couleur plate, trait épais, la forme
// en gros et en bas de casse, le prix en face.
//
// Extraite de BoutiqueClient parce que la fiche produit en a besoin elle aussi
// pour « Vous aimerez aussi ». Cette rangée-là finissait la page d'achat sur
// l'ancienne carte — inclinée, pastilles nommées, ombre douce — juste après un
// bon de commande refait. Une seule carte, écrite une fois.
//
// Les blocs enchaînent les mêmes fonds que les étapes et le pied de page : le
// site garde une palette au lieu d'en inventer une par page.
export const FONDS = ["#ffd166", "#8ad4c1", "#ff9ec7", "#b9a7f5", "#7fd4ee", "#ffb38a"];

// Six pastilles : au-delà, une rangée cesse de se lire comme un choix et
// commence à se lire comme du bruit.
const PASTILLES = 6;

export function CarteProduit({
  produit,
  index,
}: {
  produit: FeaturedProduct;
  index: number;
}) {
  // La carte s'incline vers le curseur. Souris uniquement : sur un écran
  // tactile il n'y a pas de survol, et l'appui a déjà sa propre réponse.
  function pencher(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    import("gsap").then(({ gsap }) =>
      gsap.to(el, { rotateY: x * 7, rotateX: -y * 7, duration: 0.4, ease: "power2.out", overwrite: "auto" }),
    );
  }

  function redresser(e: React.PointerEvent<HTMLAnchorElement>) {
    const el = e.currentTarget;
    import("gsap").then(({ gsap }) =>
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" }),
    );
  }

  const dispo = produit.colors.filter((c) => c.inStock);
  const montres = produit.colors.slice(0, PASTILLES);
  const reste = produit.colors.length - montres.length;

  return (
    <Link
      href={`/boutique/${produit.slug}`}
      data-apparait
      onPointerMove={pencher}
      onPointerLeave={redresser}
      className="group block rounded-[2.25rem] border-4 border-encre p-5 transition-shadow duration-300 [transform-style:preserve-3d] hover:shadow-[0_24px_44px_-22px_rgba(36,28,33,.5)] sm:p-6"
      style={{ background: FONDS[index % FONDS.length], perspective: 900 }}
    >
      <span className="flex h-[230px] items-center justify-center sm:h-[260px]">
        {produit.photoUrl ? (
          <Image
            src={produit.photoUrl}
            alt={`Veilleuse ${produit.name}`}
            width={420}
            height={420}
            quality={85}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            className="carte-photo h-full w-auto object-contain transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </span>

      {/* `flex-wrap` : un nom long comme « champignon » ne laisse pas la place
          au prix sur la même ligne, et sans retour à la ligne le prix sortait
          de la carte — le « DA » était coupé par le bord. Il descend d'une
          ligne au lieu de disparaître. */}
      <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-heading text-[30px] leading-none font-bold text-encre sm:text-[34px]">
          {produit.name.toLowerCase()}
        </span>
        <span className="font-heading text-xl text-encre sm:text-[22px]">
          {produit.price.toLocaleString("fr-FR")} DA
        </span>
      </span>

      {produit.description ? (
        <span className="mt-1.5 line-clamp-2 text-[15px] leading-snug font-medium text-encre/75">
          {produit.description}
        </span>
      ) : null}

      {/* Les coloris, dessinés comme les lampes qu'ils sont — la même marque
          que le configurateur, la fiche produit et l'admin. */}
      <span className="mt-3 flex flex-wrap items-center gap-1.5">
        {montres.map((c) => (
          <span
            key={c.id}
            title={c.inStock ? c.colorName : `${c.colorName} (rupture)`}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-encre/20 bg-papier ${
              c.inStock ? "" : "opacity-40"
            }`}
          >
            <LampMark hex={c.colorHex} hex2={c.colorHex2} className="h-6 w-6" />
          </span>
        ))}
        {reste > 0 ? (
          <span className="ml-0.5 font-heading text-sm text-encre/70">+{reste}</span>
        ) : null}
      </span>

      <span className="mt-3 block text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">
        {dispo.length === produit.colors.length
          ? `${produit.colors.length} coloris`
          : `${dispo.length} sur ${produit.colors.length} coloris disponibles`}
      </span>
    </Link>
  );
}
