import Image from "next/image";
import { LampIllustration } from "@/components/site/LampIllustration";

export type StageView =
  | { kind: "cutout"; url: string }
  | { kind: "photo"; url: string };

// Admin-entered hex, so treat anything unparseable as "no tint" rather than
// letting a bad value produce an invalid gradient.
function rgba(hex: string | null, alpha: number): string | null {
  const raw = hex?.replace("#", "").trim() ?? "";
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// The product page used to drop a portrait studio shot into a square cream
// panel, which gave you two competing backgrounds — the photo's own red
// backdrop as a hard rectangle, with cream bars either side of it. Recolouring
// the panel wouldn't fix that; the panel was never the problem.
//
// So there are two treatments here, and which one runs depends on the asset:
//
//   cutout  — the background-removed shot. It gets lit rather than framed: a
//             pool of light tinted by that colour's own hex, a soft contact
//             shadow so it sits on a surface instead of floating, and room to
//             breathe. Same "plugged in" language as the hero's hanging lamps,
//             and with no background of its own there is nothing to clash.
//
//   photo   — a real backdrop shot. A heavily blurred, over-scaled copy of the
//             SAME photo fills the panel behind the sharp one, so the edges
//             dissolve into their own colours instead of stopping against a
//             cream bar. Works at any aspect ratio, which matters because
//             these are shot on phones at whatever crop.
//
// The blurred layer is deliberately requested at 64px wide: it is blurred into
// mush anyway, so a thumbnail-sized file is indistinguishable from a full one
// and costs almost nothing.
export function ProductStage({
  view,
  alt,
  tintHex,
  sizes,
}: {
  view: StageView | null;
  alt: string;
  tintHex: string | null;
  sizes: string;
}) {
  const glow = rgba(tintHex, 0.55) ?? "var(--lueur)";
  const pool = rgba(tintHex, 0.32);
  // --lueur, the brand's "switched on" warm. Always laid down underneath the
  // colour tint, because pale lamps tint at roughly the panel's own colour
  // (Capricorne's white is #fef8ef) and their pool would otherwise vanish —
  // leaving the light colours looking flat beside the saturated ones. With
  // this base every lamp sits in warm light and the colour just shifts its
  // hue.
  const warmBase = "rgba(242, 166, 90, 0.26)";

  return (
    <div className="relative">
      {/* Outer bloom, tinted to the selected colour — the lamp reads as
          switched on and spilling light past its own edges. */}
      <div
        aria-hidden
        className="blob-photo absolute inset-6 blur-3xl"
        style={{ background: glow, opacity: 0.45 }}
      />

      <div className="blob-photo relative aspect-square overflow-hidden bg-papier">
        {view === null ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <LampIllustration size="sm" />
            <p className="font-hand text-lg text-encre/50">photo à venir</p>
          </div>
        ) : view.kind === "cutout" ? (
          <>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: [
                  pool &&
                    `radial-gradient(circle at 50% 44%, ${pool} 0%, transparent 62%)`,
                  `radial-gradient(circle at 50% 46%, ${warmBase} 0%, transparent 72%)`,
                ]
                  .filter(Boolean)
                  .join(", "),
              }}
            />
            {/* Shadow via a drop-shadow filter rather than a positioned
                ellipse. Cutouts carry different amounts of transparent
                margin, so any fixed ellipse detaches from the base on some
                photos; drop-shadow is computed from the actual alpha
                silhouette, so it stays anchored to whatever the lamp's real
                outline is. Two passes: a tight dark one for contact, a wide
                soft one for ambient. */}
            <Image
              src={view.url}
              alt={alt}
              fill
              sizes={sizes}
              quality={85}
              style={{
                filter:
                  "drop-shadow(0 10px 10px rgba(58,46,54,0.22)) drop-shadow(0 26px 28px rgba(58,46,54,0.14))",
              }}
              // Modest padding: several cutouts already carry a lot of
              // transparent margin of their own, and object-contain fits the
              // whole file including that margin, so generous padding here
              // shrinks those lamps twice over.
              className="object-contain p-6"
            />
          </>
        ) : (
          <>
            <Image
              src={view.url}
              alt=""
              aria-hidden
              fill
              sizes="64px"
              quality={85}
              // Opacity high and blur heavy on purpose: at lower opacity the
              // fill sits lighter than the sharp photo over the papier panel
              // and you can see the seam where the two meet. Over-scaled so
              // the blur's own soft edges never reach the panel edge.
              className="scale-150 object-cover opacity-90 blur-3xl"
            />
            <Image
              src={view.url}
              alt={alt}
              fill
              sizes={sizes}
              quality={85}
              className="object-contain"
            />
          </>
        )}
      </div>
    </div>
  );
}
