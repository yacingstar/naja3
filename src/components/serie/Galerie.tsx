"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedProduct } from "@/lib/products";
import { DEBUT, ENCRE, FIN, G, HEURES, M, minutes, riso, ROUGE } from "@/components/serie/style";

// Le premier écran : la série des veilleuses, comme une série d'affiches.
//
// D'après la référence qu'elle a envoyée — « Five small rituals before nine
// a.m. » — où chaque affiche est un moment de la matinée et où l'on fait
// défiler la page pour avancer l'heure. Chez Naja, chaque veilleuse est un
// moment de la soirée, et la frise va de 20 h à minuit.
//
// ── Le défilement horizontal ────────────────────────────────────────────────
// Par défaut, la rangée est un simple conteneur qui défile horizontalement
// (glisser au doigt, molette horizontale). C'est ce qu'on a sur téléphone, et
// c'est aussi ce qu'on garde sur ordinateur si GSAP ne se charge pas : la
// rangée reste utilisable, rien n'est coincé.
//
// Sur un ordinateur, GSAP épingle l'écran et traduit la molette verticale en
// déplacement horizontal — exactement le geste de la référence. La rangée ne
// défile alors plus d'elle-même (`overflow: hidden`), c'est la page qui la
// pousse.
//
// Dans les deux cas, une seule fonction (`avancer`) reçoit la progression et
// en tire l'affiche active, l'heure du coin et la position du curseur sur la
// frise.
// Le nombre de formes en toutes lettres, pour le titre.
const NOMBRES: Record<number, string> = { 3: "Trois", 4: "Quatre", 5: "Cinq", 6: "Six", 7: "Sept", 8: "Huit", 9: "Neuf", 10: "Dix" };

function heureDe(i: number): string {
  return HEURES[i % HEURES.length];
}

export function Galerie({ produits }: { produits: FeaturedProduct[] }) {
  const section = useRef<HTMLElement>(null);
  const fenetre = useRef<HTMLDivElement>(null);
  const rangee = useRef<HTMLDivElement>(null);
  const curseur = useRef<HTMLSpanElement>(null);
  const actifRef = useRef(0);
  const [actif, setActif] = useState(0);

  const n = produits.length;
  const heures = produits.map((_, i) => heureDe(i));

  const avancer = useCallback(
    (progression: number) => {
      const p = Math.min(1, Math.max(0, progression));
      const i = Math.round(p * (n - 1));
      if (i !== actifRef.current) {
        actifRef.current = i;
        setActif(i);
      }
      // Le curseur de la frise suit l'heure, pas l'index : il glisse
      // continûment entre deux affiches au lieu de sauter.
      if (curseur.current) {
        const premiere = minutes(heureDe(0));
        const derniere = minutes(heureDe(n - 1));
        const m = premiere + p * (derniere - premiere);
        curseur.current.style.left = `${((m - DEBUT) / (FIN - DEBUT)) * 100}%`;
      }
    },
    // Ne dépend que du nombre d'affiches : une fonction instable relancerait
    // l'effet d'épinglage à chaque changement d'affiche active.
    [n],
  );

  // Place le curseur dès le premier rendu, sans attendre un défilement.
  useEffect(() => avancer(0), [avancer]);

  useEffect(() => {
    const ordinateur = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ordinateur || calme) return;

    let annule = false;
    let nettoyer: (() => void) | null = null;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (annule || !section.current || !fenetre.current || !rangee.current) return;
        gsap.registerPlugin(ScrollTrigger);

        const f = fenetre.current;
        const r = rangee.current;
        f.style.overflow = "hidden";
        f.scrollLeft = 0;
        const distance = () => Math.max(0, r.scrollWidth - f.clientWidth);

        const tween = gsap.to(r, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            // Une fois et demie la largeur à parcourir : la molette avance
            // la soirée plus lentement que la rangée ne défile, comme dans
            // la référence, où l'on prend le temps de regarder chaque affiche.
            end: () => `+=${distance() * 1.5}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (st) => avancer(st.progress),
          },
        });

        nettoyer = () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          f.style.overflow = "";
          gsap.set(r, { clearProps: "transform" });
        };
      },
    );

    return () => {
      annule = true;
      nettoyer?.();
    };
  }, [avancer]);

  // Téléphone, ou ordinateur sans GSAP : c'est le défilement natif de la
  // rangée qui fait avancer l'heure.
  function surDefilement() {
    const f = fenetre.current;
    if (!f) return;
    const max = f.scrollWidth - f.clientWidth;
    avancer(max > 0 ? f.scrollLeft / max : 0);
  }

  const courant = produits[actif];

  return (
    <section
      ref={section}
      aria-labelledby="serie-titre"
      className="relative flex flex-col overflow-hidden lg:h-screen"
    >
      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 lg:pt-6">
        <Link href="/" className={`${G} flex items-center gap-1.5 text-[17px] font-bold tracking-[-.01em] uppercase`}>
          Naja
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROUGE }} />
        </Link>
        <nav className={`${M} hidden items-center gap-7 text-[11px] tracking-[.12em] uppercase md:flex`}>
          <a href="#serie-titre" className="transition hover:opacity-60">Série</a>
          <Link href="/boutique" className="transition hover:opacity-60">Boutique</Link>
          <a href="#procede" className="transition hover:opacity-60">Procédé</a>
          <a href="#questions" className="transition hover:opacity-60">Questions</a>
        </nav>
        {/* L'heure de l'affiche courante, comme l'horloge de la référence.
            Keyée : chaque nouvelle heure monte depuis sous sa ligne. */}
        <p className={`${M} flex min-w-0 items-center gap-2 overflow-hidden text-[12px] sm:text-[13px]`} aria-live="off">
          <span key={actif} className="naja-masque inline-block" style={{ color: ROUGE }}>
            {heures[actif]}
          </span>
          <span key={`n${actif}`} className="naja-masque hidden max-w-[16ch] truncate sm:inline-block">
            {courant?.name.toLowerCase()}…
          </span>
          <Link href="/boutique" className="ml-2 tracking-[.12em] uppercase underline underline-offset-4 md:hidden">
            Boutique
          </Link>
        </p>
      </header>

      {/* ── Titre ───────────────────────────────────────────────────── */}
      <div className="grid gap-5 px-5 pt-8 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pt-10">
        <h1
          id="serie-titre"
          className={`${G} text-[44px] leading-[.95] font-bold tracking-[-.035em] sm:text-[64px] lg:text-[76px]`}
        >
          <span className="block overflow-hidden pb-[.05em]">
            <span className="naja-masque inline-block" style={{ animationDelay: ".05s" }}>
              {NOMBRES[produits.length] ?? produits.length} petites lumières
            </span>
          </span>
          <span className="block overflow-hidden pb-[.05em]">
            <span className="naja-masque inline-block" style={{ animationDelay: ".15s" }}>
              <span style={{ color: ROUGE }}>après</span> le dîner.
            </span>
          </span>
        </h1>
        <div className="naja-monte max-w-[380px] lg:justify-self-end" style={{ animationDelay: ".3s" }}>
          <p className="text-[15px] leading-snug font-medium opacity-85">
            Une série de veilleuses imprimées en 3D à Alger, pour l&apos;heure qui n&apos;appartient
            qu&apos;à vous. Une affiche par moment de la soirée.
          </p>
          <p className={`${M} mt-3 flex items-center gap-2 text-[11px] tracking-[.12em] uppercase`}>
            {/* Le geste n'est pas le même : on glisse au doigt, on fait
                défiler à la molette. */}
            <span className="lg:hidden">Glisser pour avancer l&apos;heure</span>
            <span className="hidden lg:inline">Défiler pour avancer l&apos;heure</span>
            <span aria-hidden>⟶</span>
          </p>
        </div>
      </div>

      {/* ── Les affiches ────────────────────────────────────────────── */}
      <div
        ref={fenetre}
        onScroll={surDefilement}
        className="scrollbar-hidden mt-7 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden lg:mt-4 lg:snap-none"
      >
        <div ref={rangee} className="flex w-max items-start gap-5 px-5 pt-4 pb-6 sm:gap-7 sm:px-10 lg:h-full lg:items-center lg:pb-2">
          {produits.map((p, i) => {
            const encre = riso(i);
            const estActif = i === actif;
            const pente = i % 2 === 0 ? -1.6 : 1.4;
            return (
              <Link
                key={p.id}
                href={`/boutique/${p.slug}`}
                className="group naja-monte block w-[68vw] max-w-[300px] shrink-0 snap-center sm:w-[260px] lg:w-[min(22vw,calc(38vh*.8))]"
                style={{ animationDelay: `${0.35 + i * 0.07}s` }}
              >
                <div
                  className="riso relative aspect-[4/5] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
                  style={{
                    background: encre.fond,
                    transform: estActif
                      ? "translateY(-10px) rotate(0deg) scale(1.04)"
                      : `translateY(6px) rotate(${pente}deg) scale(.95)`,
                  }}
                >
                  {p.photoUrl ? (
                    <Image
                      src={p.photoUrl}
                      alt={`Veilleuse ${p.name}`}
                      fill
                      quality={85}
                      priority={i < 3}
                      sizes="(min-width: 1024px) 300px, 70vw"
                      className="object-contain p-[12%] drop-shadow-[0_10px_12px_rgba(0,0,0,.22)] transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>

                <div className="mt-4 transition-opacity duration-500" style={{ opacity: estActif ? 1 : 0.55 }}>
                  <p className="flex items-baseline gap-2.5">
                    <span className={`${M} text-[11px]`} style={{ color: ROUGE }}>
                      {heures[i]}
                    </span>
                    <span className={`${G} text-[19px] leading-none font-semibold tracking-[-.01em]`}>
                      {p.name}
                    </span>
                  </p>
                  {p.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug opacity-75">{p.description}</p>
                  ) : null}
                  <p className="mt-2.5 flex items-center gap-2.5">
                    <span
                      className={`${M} rounded-full px-2.5 py-1 text-[10px] tracking-[.1em] uppercase`}
                      style={{ background: encre.tag, color: encre.texte }}
                    >
                      {p.colors.length} coloris
                    </span>
                    <span className={`${M} text-[11px] opacity-70`}>
                      {p.price.toLocaleString("fr-FR")} DA
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── La frise ────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 sm:px-10 lg:pb-6">
        <div className="relative h-8">
          <span aria-hidden className="absolute top-3 right-0 left-0 h-px" style={{ background: `${ENCRE}40` }} />
          <span
            ref={curseur}
            aria-hidden
            className="absolute top-[7px] h-3 w-3 -translate-x-1/2 rounded-full transition-[left] duration-300 ease-out"
            style={{ background: ROUGE, left: "0%" }}
          />
          {["20:00", "21:00", "22:00", "23:00", "00:00"].map((h, i) => (
            <span
              key={h}
              className={`${M} absolute top-5 -translate-x-1/2 text-[10px] opacity-55 first:translate-x-0 last:-translate-x-full`}
              style={{ left: `${i * 25}%` }}
            >
              {h}
            </span>
          ))}
          {heures.map((h) => (
            <span
              key={h}
              aria-hidden
              className="absolute top-[9px] h-2 w-px"
              style={{ left: `${((minutes(h) - DEBUT) / (FIN - DEBUT)) * 100}%`, background: `${ENCRE}66` }}
            />
          ))}
        </div>
        <div className={`${M} mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[10px] opacity-70 sm:text-[11px]`}>
          <span>Impression 3D · PLA · faites une par une, à la commande</span>
          <span>Fait à Alger, surtout le soir</span>
        </div>
      </div>
    </section>
  );
}
