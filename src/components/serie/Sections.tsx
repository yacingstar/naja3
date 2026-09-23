"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FAQS } from "@/components/site/Faq";
import { useReveal } from "@/components/accueil/useReveal";
import { RETOURS } from "@/lib/accueil";
import { CONTACT_LINKS } from "@/lib/contact";
import { ENCRE, G, M, riso, ROUGE } from "@/components/serie/style";

// Tout ce qui suit la galerie, dans la même langue que la référence : un
// numéro de section en machine à écrire, un grand titre grotesque avec un mot
// en rouge, des aplats de risographie. La référence n'a qu'un écran ; ces
// sections sont ce que ce style donne quand on le prolonge vers le bas.

function Entete({ numero, nom, children }: { numero: string; nom: string; children: React.ReactNode }) {
  return (
    <div data-apparait className="grid gap-4 border-t pt-5 lg:grid-cols-[220px_1fr]" style={{ borderColor: `${ENCRE}33` }}>
      <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>
        {numero} — {nom}
      </p>
      <h2 className={`${G} text-[36px] leading-[.98] font-bold tracking-[-.03em] sm:text-[52px] lg:text-[60px]`}>
        {children}
      </h2>
    </div>
  );
}

// ── Les dessins du procédé ───────────────────────────────────────────────────
// Trois affiches, dessinées comme la référence dessine ses objets : formes
// pleines, contour noir, deux ou trois encres. Chaque dessin a une petite
// boucle GSAP (voir Procede) ; au repos il est complet et immobile.

function DessinChoisir() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      {["#ef4f2a", "#f5c542", "#e290d2"].map((c, i) => (
        <circle key={c} data-bouge cx={62 + i * 38} cy="96" r="30" fill={c} stroke={ENCRE} strokeWidth="4" />
      ))}
      <path data-doigt d="M118 128 l0 44 l11 -11 l9 20 l9 -4 l-9 -20 l16 0 z" fill="#f4ecdb" stroke={ENCRE} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function DessinImprimer() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      {/* Les couches de l'abat-jour, de bas en haut. */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          data-couche
          x={52 + Math.abs(2.5 - i) * 6}
          y={150 - i * 15}
          width={96 - Math.abs(2.5 - i) * 12}
          height="13"
          rx="6"
          fill="#f4ecdb"
          stroke={ENCRE}
          strokeWidth="3.5"
        />
      ))}
      <g data-buse>
        <rect x="88" y="30" width="24" height="26" fill="#4f87c2" stroke={ENCRE} strokeWidth="4" />
        <path d="M92 56 L100 70 L108 56 Z" fill={ENCRE} />
      </g>
    </svg>
  );
}

function DessinPayer() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <g data-colis>
        <rect x="46" y="84" width="108" height="78" fill="#d9a766" stroke={ENCRE} strokeWidth="4" />
        <path d="M46 84 L70 60 L178 60 L154 84 Z" fill="#e8bd7f" stroke={ENCRE} strokeWidth="4" strokeLinejoin="round" />
        <path d="M154 84 L178 60 L178 138 L154 162 Z" fill="#b98546" stroke={ENCRE} strokeWidth="4" strokeLinejoin="round" />
        <rect x="90" y="84" width="20" height="78" fill="#ef4f2a" stroke={ENCRE} strokeWidth="3" />
      </g>
      <g data-billet>
        <rect x="22" y="120" width="70" height="40" rx="4" fill="#9fd08a" stroke={ENCRE} strokeWidth="4" transform="rotate(-10 57 140)" />
        <text x="44" y="146" fontSize="16" fontWeight="700" fill={ENCRE} transform="rotate(-10 57 140)" fontFamily="monospace">DA</text>
      </g>
    </svg>
  );
}

const ETAPES = [
  { n: "01", titre: "Vous choisissez", texte: "La forme, puis la couleur. Deux minutes, sans compte, sans rien payer tout de suite.", Dessin: DessinChoisir, etiquette: "En ligne" },
  { n: "02", titre: "On l'imprime pour vous", texte: "Entre 8 et 15 heures d'impression, couche par couche, puis le ponçage et le montage à la main.", Dessin: DessinImprimer, etiquette: "Atelier" },
  { n: "03", titre: "Vous payez au livreur", texte: "À la livraison, pas avant. Les 58 wilayas, à domicile ou en point de retrait. Aucun acompte.", Dessin: DessinPayer, etiquette: "Chez vous" },
];

function Procede() {
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let annule = false;
    const tweens: gsap.core.Tween[] = [];
    import("gsap").then(({ gsap }) => {
      if (annule || !zone.current) return;
      const z = zone.current;
      // Toutes des boucles sur des transformations, depuis l'état de repos.
      z.querySelectorAll("[data-bouge]").forEach((el, i) =>
        tweens.push(gsap.to(el, { y: -8, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.25 })),
      );
      z.querySelectorAll("[data-doigt]").forEach((el) =>
        tweens.push(gsap.to(el, { x: -34, y: -10, duration: 1.8, ease: "power1.inOut", yoyo: true, repeat: -1 })),
      );
      z.querySelectorAll("[data-buse]").forEach((el) =>
        tweens.push(gsap.to(el, { x: 26, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 })),
      );
      z.querySelectorAll("[data-couche]").forEach((el, i) =>
        tweens.push(gsap.to(el, { x: i % 2 ? 2 : -2, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.08 })),
      );
      z.querySelectorAll("[data-colis]").forEach((el) =>
        tweens.push(gsap.to(el, { y: -6, rotate: -1.5, transformOrigin: "50% 100%", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 })),
      );
      z.querySelectorAll("[data-billet]").forEach((el) =>
        tweens.push(gsap.to(el, { rotate: 6, transformOrigin: "30% 50%", duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 })),
      );
    });
    return () => {
      annule = true;
      tweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <section id="procede" className="px-5 pt-20 sm:px-10 lg:pt-28">
      <Entete numero="02" nom="Procédé">
        Imprimée <span style={{ color: ROUGE }}>pour vous</span>, pas pour un stock.
      </Entete>
      <div ref={zone} className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        {ETAPES.map(({ n, titre, texte, Dessin, etiquette }, i) => {
          const encre = riso(i + 1);
          return (
            <article key={n} data-apparait>
              <div
                className="riso aspect-[4/5] p-[14%]"
                style={{ background: encre.fond, transform: `rotate(${i === 1 ? 1.2 : -1.2}deg)` }}
              >
                <Dessin />
              </div>
              <p className="mt-4 flex items-baseline gap-2.5">
                <span className={`${M} text-[11px]`} style={{ color: ROUGE }}>
                  {n}
                </span>
                <span className={`${G} text-[20px] font-semibold tracking-[-.01em]`}>{titre}</span>
              </p>
              <p className="mt-1.5 max-w-[34ch] text-[14px] leading-snug opacity-75">{texte}</p>
              <span
                className={`${M} mt-3 inline-block rounded-full px-2.5 py-1 text-[10px] tracking-[.1em] uppercase`}
                style={{ background: encre.tag, color: encre.texte }}
              >
                {etiquette}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ── Les retours, comme des tirages ───────────────────────────────────────────
// Les photos des clientes, posées comme des épreuves avec leur marge blanche,
// légèrement de travers. Une rangée qui se fait glisser ; sur ordinateur elle
// dérive aussi doucement avec le défilement de la page.
function Retours() {
  const rangee = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const ordinateur = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (!ordinateur || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let annule = false;
    let tween: gsap.core.Tween | null = null;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (annule || !rangee.current || !section.current) return;
      gsap.registerPlugin(ScrollTrigger);
      tween = gsap.to(rangee.current, {
        x: -160,
        ease: "none",
        scrollTrigger: { trigger: section.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
      });
    });
    return () => {
      annule = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, []);

  return (
    <section ref={section} className="pt-20 lg:pt-28">
      <div className="px-5 sm:px-10">
        <Entete numero="03" nom="Chez vous">
          Elles sont <span style={{ color: ROUGE }}>déjà</span> allumées quelque part.
        </Entete>
      </div>
      <div className="scrollbar-hidden mt-10 snap-x snap-mandatory overflow-x-auto">
        <div ref={rangee} className="flex w-max gap-6 px-5 pb-6 sm:px-10">
          {RETOURS.map((r, i) => (
            <figure
              key={r.src}
              className="w-[62vw] max-w-[260px] shrink-0 snap-center bg-[#f7f2e7] p-2.5 pb-3 shadow-[0_12px_24px_-16px_rgba(29,26,23,.5)]"
              style={{ transform: `rotate(${[-1.8, 1.2, -0.6, 1.6][i % 4]}deg)` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image src={r.src} alt={r.alt} fill quality={85} sizes="260px" className="object-cover" />
              </div>
              <figcaption className="mt-2.5">
                <span className={`${M} text-[10px] tracking-[.12em] uppercase opacity-60`}>
                  Tirage № {String(i + 1).padStart(2, "0")}
                </span>
                {r.quote ? (
                  <span className="mt-1 line-clamp-3 block text-[12px] leading-snug">« {r.quote} »</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const [ouverte, setOuverte] = useState<number | null>(0);
  return (
    <section id="questions" className="px-5 pt-20 sm:px-10 lg:pt-28">
      <Entete numero="04" nom="Questions">
        Ce qu&apos;on nous <span style={{ color: ROUGE }}>demande</span>.
      </Entete>
      <div className="mt-8 lg:ml-[236px]">
        {FAQS.map((f, i) => {
          const ouvert = ouverte === i;
          return (
            <div key={f.q} data-apparait className="border-b" style={{ borderColor: `${ENCRE}33` }}>
              <button
                type="button"
                onClick={() => setOuverte(ouvert ? null : i)}
                aria-expanded={ouvert}
                className="flex w-full items-baseline gap-4 py-5 text-left"
              >
                <span className={`${M} text-[11px]`} style={{ color: ROUGE }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`${G} flex-1 text-[19px] font-semibold tracking-[-.01em] sm:text-[22px]`}>{f.q}</span>
                <span aria-hidden className={`${M} text-[18px] transition-transform duration-300 ${ouvert ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {ouvert ? (
                <p className="naja-monte max-w-[60ch] pb-6 pl-9 text-[15px] leading-relaxed opacity-80">{f.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Fin() {
  return (
    <section className="px-5 pt-24 pb-8 sm:px-10 lg:pt-32">
      <div data-apparait className="border-t pt-10" style={{ borderColor: `${ENCRE}33` }}>
        <h2 className={`${G} max-w-[14ch] text-[44px] leading-[.95] font-bold tracking-[-.035em] sm:text-[72px] lg:text-[92px]`}>
          Choisissez <span style={{ color: ROUGE }}>la vôtre</span>, ce soir.
        </h2>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/boutique"
            className={`${M} inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-[12px] tracking-[.14em] text-[#ebe3d3] uppercase transition hover:gap-5`}
            style={{ background: ENCRE }}
          >
            Voir la boutique <span aria-hidden>⟶</span>
          </Link>
          <span className={`${M} text-[11px] tracking-[.1em] uppercase opacity-70`}>
            Paiement à la livraison · 58 wilayas · aucun acompte
          </span>
        </div>
      </div>

      <footer className={`${M} mt-20 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 text-[10px] opacity-75 sm:text-[11px]`}>
        <span>© {new Date().getFullYear()} Naja · veilleuses imprimées en 3D</span>
        <span className="flex flex-wrap gap-5">
          <Link href="/boutique" className="underline underline-offset-4">Boutique</Link>
          {CONTACT_LINKS.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {l.label}
            </a>
          ))}
        </span>
        <span>Fait à Alger, surtout le soir</span>
      </footer>
    </section>
  );
}

export function Sections() {
  const zone = useRef<HTMLDivElement>(null);
  // Position seulement, jamais l'opacité : voir useReveal.
  useReveal(zone, "[data-apparait]");
  return (
    <div ref={zone}>
      <Procede />
      <Retours />
      <Questions />
      <Fin />
    </div>
  );
}
