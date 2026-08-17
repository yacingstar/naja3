import type { CSSProperties } from "react";
import { Reveal } from "@/components/site/Reveal";
import { WavyBackground } from "@/components/site/WavyBackground";

// ─── EDIT ME ────────────────────────────────────────────────────────────
// Body copy lives here and nowhere else — swap in the client's real
// numbers (print hours etc.) by editing `body` below.
//
// `illustration`: leave `null` to keep the placeholder box. To use the
// real artwork, drop the file in `public/craft/` and set the path here,
// e.g. "/craft/etape-1.svg". Served that way the SVG loads inside an
// <img>, which page CSS physically cannot reach into — so the baked-in
// --encre strokes and --papier fills stay exactly as authored. That's a
// stronger guarantee than inlining the markup, where a stray global rule
// could still recolour them.
// ────────────────────────────────────────────────────────────────────────
const STEPS: Array<{
  title: string;
  body: string;
  illustration: string | null;
  bg: string;
  rotate: number;
  offset: number;
}> = [
  {
    title: "Le dessin",
    body: "Chaque modèle est dessiné et modélisé en 3D avant d'exister.",
    illustration: "/craft/1-le-dessin.svg",
    bg: "bg-blush",
    rotate: -3,
    offset: 0,
  },
  {
    title: "L'impression",
    body: "Imprimée couche par couche, plusieurs heures par lampe.",
    illustration: "/craft/2-l-impression.svg",
    bg: "bg-lueur",
    rotate: 2.5,
    offset: 30,
  },
  {
    title: "Les finitions",
    body: "Assemblée, câblée et vérifiée à la main, une par une.",
    illustration: "/craft/3-les-finitions.svg",
    bg: "bg-crepuscule",
    rotate: -2,
    offset: 10,
  },
  {
    title: "L'emballage",
    body: "Emballée avec soin et envoyée chez vous.",
    illustration: "/craft/4-l-emballage.svg",
    bg: "bg-sauge",
    rotate: 3,
    offset: 36,
  },
];

// Replaces the old "Comment ça marche" ordering steps — COD ordering is
// self-evident to Algerian customers, so this shows the craft instead.
// Sits after the catalogue on purpose: lamps first, process second.
export function CraftSteps() {
  return (
    <section
      id="comment-c-est-fait"
      className="snap-section relative overflow-hidden rounded-[clamp(2rem,6vw,4rem)] py-24"
    >
      {/* Same wavy treatment as the hero, recolored ("dusk" palette) — a
          family resemblance rather than a repeat, so this section reads as
          its own colorful "room" opening and closing with rounded corners
          against the plain eggshell sections above (catalog) and below
          (faq), the same way the hero already closes into the catalog. */}
      <WavyBackground palette="dusk" />

      {/* Wider than the site's usual max-w-6xl: the artwork is square, so
          the cards have to be tall enough to give a 1:1 illustration real
          presence, and taller cards need matching width to stay in
          proportion. Widened further (7xl -> [92rem]) so each card — and
          its illustration, which fills the card at aspect-square w-full —
          renders bigger. */}
      <div className="relative mx-auto max-w-[92rem] px-6">
        <Reveal>
          <h2 className="text-center font-heading text-3xl">Comment c&apos;est fait</h2>
        </Reveal>

        {/* Desktop: one overlapping, hand-placed row. Mobile: a plain
            full-width stack — the tilt and overlap are dropped entirely
            (see .craft-card in globals.css), since scattered cards only
            read as deliberate when there's width to scatter across. */}
        <ol className="mt-14 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-0">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.title}
              delay={index * 90}
              className={`craft-item w-full sm:flex-1 ${index > 0 ? "sm:-ml-6 lg:-ml-8" : ""}`}
            >
              <li
                style={
                  {
                    "--craft-rotate": `${step.rotate}deg`,
                    "--craft-offset": `${step.offset}px`,
                  } as CSSProperties
                }
                // The extra right padding keeps content clear of the strip
                // the next card overlaps — without it the tail of each
                // line, and the right edge of the square artwork, sit
                // hidden under the card on top. Applied to every card
                // including the last (which nothing overlaps) so all four
                // stay identical in size; the artwork is square, and
                // uneven padding would make one illustration render
                // noticeably larger than its neighbours.
                className={`craft-card list-none rounded-3xl p-6 shadow-lg sm:p-8 sm:pr-16 lg:pr-20 ${step.bg}`}
              >
                <p className="font-hand text-2xl text-encre/70">Étape #{index + 1}</p>

                {step.illustration ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static SVG served from /public with its own baked-in colours; next/image would add no value and <img> keeps page CSS out of it
                  <img
                    src={step.illustration}
                    alt=""
                    // aspect-square, not a fixed height: the artwork is
                    // authored on a 500x500 viewBox, so a 1:1 box lets it
                    // fill the width it's given instead of being letterboxed.
                    className="mt-4 aspect-square w-full object-contain"
                  />
                ) : (
                  <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-encre/25 text-xs text-encre/45">
                    illustration
                  </div>
                )}

                <h3 className="mt-5 font-heading text-2xl font-bold text-encre">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-snug text-encre/75">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
