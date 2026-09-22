"use client";

import { useEffect, useRef } from "react";

// The three steps answer the three questions someone hesitating actually has:
// is it complicated, why does it cost that and why do I wait, and what if I
// get cheated. That last one is the biggest brake on buying online here, which
// is why "vous payez au livreur" gets a third of the section rather than a
// line of small print.
const ETAPES = [
  {
    n: "1",
    fond: "#ffd166",
    titre: "Vous choisissez",
    texte: "La forme, puis la couleur. Deux minutes, sans créer de compte, sans rien payer tout de suite.",
  },
  {
    n: "2",
    fond: "#8ad4c1",
    titre: "On l'imprime pour vous",
    texte: "Entre 8 et 15 heures de fil déposé couche par couche, puis le ponçage et le montage à la main.",
  },
  {
    n: "3",
    fond: "#ff9ec7",
    titre: "Vous payez au livreur",
    texte: "À la livraison, pas avant. Les 58 wilayas, à domicile ou en point de retrait. Aucun acompte.",
  },
];

export function Etapes({ encre, encreDouce }: { encre: string; encreDouce: string }) {
  const bloc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let annule = false;
    import("gsap").then(({ gsap }) => {
      if (annule || !bloc.current) return;
      // Step 2 is a print in progress rather than a drawing of one: the nozzle
      // sweeps, and the layers rise one after another, for ever.
      gsap.to(bloc.current.querySelectorAll(".buse"), {
        x: 20,
        duration: 1.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      // Les couches montent au lieu de grandir depuis zéro : une couche
      // figée à scaleY 0 serait invisible, une couche figée 14 px plus bas se
      // voit quand même. Aucune animation de cette page ne peut cacher son
      // propre contenu.
      gsap.fromTo(
        bloc.current.querySelectorAll(".couche"),
        { y: 14 },
        { y: 0, duration: 0.5, ease: "power2.out", stagger: { each: 0.34, repeat: -1, repeatDelay: 1.2 } },
      );
    });
    return () => {
      annule = true;
    };
  }, []);

  return (
    <div id="comment" ref={bloc} className="scroll-mt-20 px-5 pt-12 sm:px-12 sm:pt-16">
      <h2
        className="font-heading text-[42px] leading-none font-bold tracking-[-.02em] sm:text-[54px]"
        style={{ color: encre }}
      >
        Comment ça se passe.
      </h2>
      <p className="mt-3 max-w-[640px] text-base font-medium sm:text-lg" style={{ color: encreDouce }}>
        Rien n&apos;est en stock. Votre veilleuse commence à s&apos;imprimer le jour où vous la commandez — c&apos;est
        pour ça qu&apos;aucune n&apos;est tout à fait identique.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {ETAPES.map((e) => (
          <div
            key={e.n}
            className="rounded-[2rem] border-4 border-encre p-6 text-encre transition duration-300 hover:-translate-y-2 hover:rotate-1"
            style={{ background: e.fond }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-encre font-heading text-[22px] text-papier">
              {e.n}
            </span>
            <div className="flex h-[130px] items-center justify-center">
              {e.n === "1" ? <IconeChoix /> : e.n === "2" ? <IconeImpression /> : <IconeLivraison />}
            </div>
            <p className="font-heading text-[25px] font-semibold sm:text-[27px]">{e.titre}</p>
            <p className="mt-2 text-[15px] leading-relaxed font-medium text-encre/75 sm:text-base">{e.texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconeChoix() {
  return (
    <svg viewBox="0 0 120 100" width="134" height="112" aria-hidden>
      <circle cx="30" cy="34" r="16" fill="#ff5d8f" stroke="#241c21" strokeWidth="4" />
      <circle cx="66" cy="34" r="16" fill="#0290e9" stroke="#241c21" strokeWidth="4" />
      <circle cx="102" cy="34" r="16" fill="#5cbf7d" stroke="#241c21" strokeWidth="4" />
      <path
        d="M52 56 L52 92 L62 82 L70 96 L78 92 L70 78 L84 78 Z"
        fill="#fffdf7"
        stroke="#241c21"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeImpression() {
  return (
    <svg viewBox="0 0 120 110" width="134" height="123" aria-hidden>
      <rect className="couche" x="34" y="80" width="52" height="11" rx="5" fill="#fffdf7" stroke="#241c21" strokeWidth="4" />
      <rect className="couche" x="30" y="64" width="60" height="11" rx="5" fill="#fffdf7" stroke="#241c21" strokeWidth="4" />
      <rect className="couche" x="26" y="48" width="68" height="11" rx="5" fill="#fffdf7" stroke="#241c21" strokeWidth="4" />
      <rect className="couche" x="32" y="32" width="56" height="11" rx="5" fill="#fffdf7" stroke="#241c21" strokeWidth="4" />
      <circle className="buse" cx="60" cy="16" r="9" fill="#241c21" />
    </svg>
  );
}

function IconeLivraison() {
  return (
    <svg viewBox="0 0 130 100" width="145" height="112" aria-hidden>
      <rect x="12" y="34" width="62" height="44" rx="8" fill="#fffdf7" stroke="#241c21" strokeWidth="4" />
      <path d="M74 48 L100 48 L116 64 L116 78 L74 78 Z" fill="#fffdf7" stroke="#241c21" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="36" cy="82" r="10" fill="#241c21" />
      <circle cx="98" cy="82" r="10" fill="#241c21" />
      <path d="M28 52 L38 62 L58 42" fill="none" stroke="#241c21" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
