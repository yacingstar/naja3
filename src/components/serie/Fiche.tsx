"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DirectOrderForm } from "@/components/site/DirectOrderForm";
import { Entete } from "@/components/serie/Entete";
import { Pied } from "@/components/serie/Pied";
import { ENCRE, G, M, riso, ROUGE } from "@/components/serie/style";
import { trackViewContent } from "@/lib/analytics";
import type { DeliveryRate } from "@/lib/deliveryRates";
import type { FeaturedProduct, ProductColorDetail } from "@/lib/products";

// La fiche produit dans le registre « série » : la veilleuse sur son aplat de
// risographie à gauche, la fiche technique et le bon de commande à droite.
//
// Le bon de commande est le composant existant, à l'identique — aucune ligne
// de sa logique n'est touchée. Il passe dans le registre parce que les pages
// « série » redéfinissent `--font-heading`, `--papier` et `--encre` sur leur
// sous-arbre (voir globals.css) : ses `font-heading` deviennent la grotesque,
// ses aplats le papier crème.
//
// Le choix du coloris vit ici et non dans le formulaire : la photo de gauche
// en dépend, et on choisit une couleur en regardant la lampe.
export function Fiche({
  produit,
  colors,
  rates,
  index,
  aussi,
}: {
  produit: { id: number; slug: string; name: string; price: number; description: string };
  colors: ProductColorDetail[];
  rates: DeliveryRate[];
  /** Le rang de la veilleuse au catalogue : son numéro et son encre. */
  index: number;
  aussi: FeaturedProduct[];
}) {
  const [colorisId, setColorisId] = useState(colors[0]?.id);
  const [vue, setVue] = useState(0);

  const coloris = colors.find((c) => c.id === colorisId) ?? colors[0];
  const encre = riso(index);

  // Arrivée depuis un lien coloré (#c<id>). Le fragment n'existe que dans le
  // navigateur : le lire pendant le rendu ferait diverger le HTML du serveur
  // et celui du client.
  useEffect(() => {
    const cible = Number(window.location.hash.replace("#c", ""));
    if (cible && colors.some((c) => c.id === cible)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColorisId(cible);
    }
  }, [colors]);

  useEffect(() => {
    trackViewContent({ id: produit.slug, name: produit.name, value: produit.price });
  }, [produit.slug, produit.name, produit.price]);

  // Le détourage d'abord — c'est la silhouette qu'on choisit — puis les photos
  // prises dans une vraie pièce.
  const vues = coloris
    ? [
        ...(coloris.cutoutPhotoUrl ? [{ kind: "cutout" as const, url: coloris.cutoutPhotoUrl }] : []),
        ...coloris.photos.map((p) => ({ kind: "photo" as const, url: p.url })),
      ]
    : [];
  const vueCourante = vues[vue] ?? vues[0] ?? null;

  function choisir(id: number) {
    setColorisId(id);
    setVue(0);
  }

  const numero = `№ ${String(index + 1).padStart(2, "0")}`;

  return (
    <div>
      <Entete courant="produit" droite={<span className="hidden opacity-80 sm:inline">{numero}</span>} />

      <nav className={`${M} px-5 pt-6 text-[11px] tracking-[.12em] uppercase opacity-70 sm:px-10`}>
        <Link href="/boutique" className="underline underline-offset-4">
          Boutique
        </Link>
        <span aria-hidden> / </span>
        <span>{produit.name}</span>
      </nav>

      <div className="grid gap-8 px-5 pt-5 sm:px-10 lg:grid-cols-2 lg:gap-14 lg:pt-8">
        {/* ── L'affiche ───────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {/* Keyée sur le coloris : changer de couleur rejoue l'entrée, donc la
              photo arrive au lieu de se substituer en silence. */}
          <div
            key={coloris?.id ?? "vide"}
            className="riso naja-photo relative aspect-[4/5] overflow-hidden"
            style={{ background: encre.fond }}
          >
            {vueCourante ? (
              <Image
                src={vueCourante.url}
                alt={coloris ? `${produit.name} — ${coloris.colorName}` : produit.name}
                fill
                priority
                quality={85}
                sizes="(min-width: 1024px) 50vw, 90vw"
                className={
                  vueCourante.kind === "cutout"
                    ? "object-contain p-[12%] drop-shadow-[0_14px_16px_rgba(0,0,0,.25)]"
                    : "object-cover"
                }
              />
            ) : null}
            <span className={`${M} absolute top-4 left-4 text-[11px] text-[#f4ecdb] opacity-90`}>{numero}</span>
          </div>

          {vues.length > 1 ? (
            <div className="mt-3 flex gap-2">
              {vues.map((v, i) => (
                <button
                  key={v.url}
                  type="button"
                  onClick={() => setVue(i)}
                  aria-label={v.kind === "cutout" ? "La lampe seule" : `Photo ${i}`}
                  aria-current={i === vue}
                  className="h-14 w-14 overflow-hidden border transition"
                  style={{ borderColor: i === vue ? ROUGE : `${ENCRE}33`, background: encre.fond }}
                >
                  <Image
                    src={v.url}
                    alt=""
                    width={56}
                    height={56}
                    sizes="56px"
                    quality={85}
                    className={`h-full w-full ${v.kind === "cutout" ? "object-contain p-1" : "object-cover"}`}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── La fiche ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <h1 className={`${G} text-[44px] leading-[.95] font-bold tracking-[-.035em] sm:text-[58px]`}>
            <span className="block overflow-hidden pb-[.05em]">
              <span className="naja-masque inline-block">{produit.name}</span>
            </span>
          </h1>

          {/* Le prix, en grand, sur sa propre ligne : c'est la deuxième chose
              qu'on regarde après la lampe. */}
          <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className={`${G} text-[34px] leading-none font-bold tracking-[-.02em] tabular-nums`}>
              {produit.price.toLocaleString("fr-FR")}{" "}
              <span className="text-[17px] font-medium opacity-60">DA</span>
            </span>
            {coloris ? (
              <span
                key={coloris.id}
                className={`${M} naja-monte inline-flex items-center gap-2 text-[11px] tracking-[.12em] uppercase`}
              >
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 rounded-full border"
                  style={{
                    borderColor: `${ENCRE}55`,
                    background: coloris.colorHex2
                      ? `linear-gradient(to bottom, ${coloris.colorHex ?? "#ddd"} 50%, ${coloris.colorHex2} 50%)`
                      : (coloris.colorHex ?? "#ddd"),
                  }}
                />
                {coloris.colorName}
                {!coloris.inStock ? " — rupture" : ""}
              </span>
            ) : null}
          </p>

          {produit.description ? (
            <p className="mt-5 max-w-prose text-[15px] leading-relaxed whitespace-pre-line opacity-80">
              {produit.description}
            </p>
          ) : null}

          <p className={`${M} mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] tracking-[.1em] uppercase opacity-70`}>
            <span>Paiement à la livraison</span>
            <span>·</span>
            <span>Imprimée à la commande</span>
            <span>·</span>
            <span>58 wilayas</span>
          </p>

          {/* ── Le nuancier ─────────────────────────────────────── */}
          {colors.length > 0 ? (
            <div className="mt-8 border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
              <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>
                01 — Le coloris · {colors.length} encres
              </p>
              <div role="radiogroup" aria-label="Coloris" className="mt-3 flex flex-wrap gap-2">
                {colors.map((c) => {
                  const choisi = c.id === coloris?.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={choisi}
                      aria-label={c.inStock ? c.colorName : `${c.colorName} (rupture)`}
                      title={c.inStock ? c.colorName : `${c.colorName} (rupture)`}
                      disabled={!c.inStock}
                      onClick={() => choisir(c.id)}
                      // Un carré d'encre, comme un nuancier d'imprimeur. Le
                      // choisi est cerclé de rouge et légèrement plus haut.
                      className={`relative h-9 w-9 border transition-transform duration-200 ${
                        choisi ? "-translate-y-1" : ""
                      } ${c.inStock ? "hover:-translate-y-1" : "cursor-not-allowed opacity-35"}`}
                      style={{
                        borderColor: choisi ? ROUGE : `${ENCRE}44`,
                        borderWidth: choisi ? 2 : 1,
                        background: c.colorHex2
                          ? `linear-gradient(to bottom, ${c.colorHex ?? "#ddd"} 50%, ${c.colorHex2} 50%)`
                          : (c.colorHex ?? "#ddd"),
                      }}
                    >
                      {!c.inStock ? (
                        <span
                          aria-hidden
                          className="absolute inset-0 m-auto h-px w-9 rotate-45"
                          style={{ background: `${ENCRE}aa` }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Le bon de commande ──────────────────────────────── */}
          <div className="mt-8 border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
            <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>02 — La commande</p>
            {coloris ? (
              <DirectOrderForm
                product={{ id: produit.id, slug: produit.slug, name: produit.name, price: produit.price }}
                colors={colors}
                selectedColorId={coloris.id}
                onSelectColor={choisir}
                showColorStep={false}
                rates={rates}
              />
            ) : (
              <p className="mt-4 text-[15px] opacity-70">
                Cette veilleuse n&apos;a pas encore de coloris en ligne — repassez très bientôt.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Le reste de la série ────────────────────────────────── */}
      {aussi.length > 0 ? (
        <section className="px-5 pt-24 sm:px-10 lg:pt-32">
          <div className="grid gap-4 border-t pt-5 lg:grid-cols-[220px_1fr]" style={{ borderColor: `${ENCRE}33` }}>
            <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>Aussi</p>
            <h2 className={`${G} text-[36px] leading-[.98] font-bold tracking-[-.03em] sm:text-[52px]`}>
              Le reste de <span style={{ color: ROUGE }}>la série</span>.
            </h2>
          </div>
          <div className="scrollbar-hidden mt-8 snap-x snap-mandatory overflow-x-auto">
            <div className="flex w-max gap-5 pb-4 sm:gap-7">
              {aussi.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/boutique/${p.slug}`}
                  className="group block w-[62vw] max-w-[260px] shrink-0 snap-center sm:w-[240px]"
                >
                  <div
                    className="riso relative aspect-[4/5] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform:rotate(-1.2deg)] group-hover:[transform:translateY(-8px)_rotate(0deg)_scale(1.02)]"
                    style={{ background: riso(i + index + 1).fond }}
                  >
                    {p.photoUrl ? (
                      <Image
                        src={p.photoUrl}
                        alt={`Veilleuse ${p.name}`}
                        fill
                        quality={85}
                        sizes="260px"
                        className="object-contain p-[12%] drop-shadow-[0_10px_12px_rgba(0,0,0,.22)]"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 flex items-baseline gap-2.5">
                    <span className={`${G} min-w-0 truncate text-[18px] font-semibold tracking-[-.01em]`}>
                      {p.name}
                    </span>
                    <span className={`${G} ml-auto shrink-0 text-[18px] font-semibold tabular-nums`}>
                      {p.price.toLocaleString("fr-FR")}{" "}
                      <span className="text-[12px] font-medium opacity-60">DA</span>
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Pied />
    </div>
  );
}
