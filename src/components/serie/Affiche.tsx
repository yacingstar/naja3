import Image from "next/image";
import type { FeaturedProduct } from "@/lib/products";
import { G, M, riso, ROUGE } from "@/components/serie/style";

// Une veilleuse en affiche : l'aplat de risographie avec la lampe dessus,
// puis la légende — repère en rouge (l'heure sur l'accueil, le numéro dans la
// boutique), nom, une ligne, l'étiquette des coloris et le prix.
//
// Le mouvement du panneau appartient à la page qui l'affiche : l'accueil le
// pilote depuis le défilement (`transform`), la boutique le redresse au
// survol. Sans `transform`, c'est le comportement de la boutique : incliné au
// repos, droit et soulevé au survol du lien parent (`group`).
export function Affiche({
  produit,
  index,
  repere,
  transform,
  opaciteLegende = 1,
  pastilles = false,
  sizes,
  priority = false,
}: {
  produit: FeaturedProduct;
  index: number;
  repere: string;
  transform?: string;
  opaciteLegende?: number;
  pastilles?: boolean;
  sizes: string;
  priority?: boolean;
}) {
  const encre = riso(index);
  const pente = index % 2 === 0 ? -1.6 : 1.4;

  return (
    <>
      <div
        className={`riso relative aspect-[4/5] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${
          transform
            ? ""
            : "[transform:rotate(var(--pente))] group-hover:[transform:translateY(-8px)_rotate(0deg)_scale(1.02)] group-focus-visible:[transform:translateY(-8px)_rotate(0deg)_scale(1.02)]"
        }`}
        style={
          transform
            ? { background: encre.fond, transform }
            : ({ background: encre.fond, "--pente": `${pente}deg` } as React.CSSProperties)
        }
      >
        {produit.photoUrl ? (
          <div data-lampe className="absolute inset-0">
            <Image
              src={produit.photoUrl}
              alt={`Veilleuse ${produit.name}`}
              fill
              quality={85}
              priority={priority}
              sizes={sizes}
              className="object-contain p-[12%] drop-shadow-[0_10px_12px_rgba(0,0,0,.22)] transition-transform duration-700 group-hover:scale-[1.05]"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 transition-opacity duration-500" style={{ opacity: opaciteLegende }}>
        <p className="flex items-baseline gap-2.5">
          <span className={`${M} text-[11px]`} style={{ color: ROUGE }}>
            {repere}
          </span>
          <span className={`${G} text-[19px] leading-none font-semibold tracking-[-.01em]`}>{produit.name}</span>
        </p>
        {produit.description ? (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug opacity-75">{produit.description}</p>
        ) : null}
        {/* Les coloris en petites pastilles plates, comme des encres sur un
            nuancier. La boutique les montre ; sur l'accueil l'étiquette suffit. */}
        {pastilles && produit.colors.length > 0 ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-1" aria-label={`${produit.colors.length} coloris`}>
            {produit.colors.slice(0, 10).map((c) => (
              <span
                key={c.id}
                title={c.colorName}
                className={`h-3.5 w-3.5 rounded-full border ${c.inStock ? "" : "opacity-30"}`}
                style={{
                  borderColor: "rgba(29,26,23,.35)",
                  background: c.colorHex2
                    ? `linear-gradient(to bottom, ${c.colorHex ?? "#ddd"} 50%, ${c.colorHex2} 50%)`
                    : (c.colorHex ?? "#ddd"),
                }}
              />
            ))}
            {produit.colors.length > 10 ? (
              <span className={`${M} ml-1 text-[10px] opacity-70`}>+{produit.colors.length - 10}</span>
            ) : null}
          </p>
        ) : null}
        <p className="mt-2.5 flex items-center gap-2.5">
          <span
            className={`${M} rounded-full px-2.5 py-1 text-[10px] tracking-[.1em] uppercase`}
            style={{ background: encre.tag, color: encre.texte }}
          >
            {produit.colors.length} coloris
          </span>
          <span className={`${M} text-[11px] opacity-70`}>{produit.price.toLocaleString("fr-FR")} DA</span>
        </p>
      </div>
    </>
  );
}
