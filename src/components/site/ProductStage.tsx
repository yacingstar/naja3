import Image from "next/image";
import { LampIllustration } from "@/components/site/LampIllustration";

export type StageView =
  | { kind: "cutout"; url: string }
  | { kind: "photo"; url: string };

// The product page used to drop a portrait studio shot into a square cream
// panel, which gave you two competing backgrounds — the photo's own red
// backdrop as a hard rectangle, with cream bars either side of it. Recolouring
// the panel wouldn't fix that; the panel was never the problem.
//
// So there are two treatments here, and which one runs depends on the asset:
//
//   cutout  — the background-removed shot, presented plainly on the panel with
//             a soft contact shadow so it sits on a surface rather than
//             floating. It carries no background of its own, so there is
//             nothing left to clash.
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
  sizes,
}: {
  view: StageView | null;
  alt: string;
  sizes: string;
}) {
  return (
    <div className="relative">
      <div className="blob-photo relative aspect-square overflow-hidden bg-papier">
        {view === null ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <LampIllustration size="sm" />
            <p className="font-hand text-lg text-encre/50">photo à venir</p>
          </div>
        ) : view.kind === "cutout" ? (
          <>
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
