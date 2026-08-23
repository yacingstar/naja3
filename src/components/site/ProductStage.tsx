"use client";

import Image from "next/image";
import { useState } from "react";
import { LampIllustration } from "@/components/site/LampIllustration";

export type StageView =
  | { kind: "cutout"; url: string }
  | { kind: "photo"; url: string };

// Split out and keyed by URL so switching views genuinely remounts it.
//
// This is the fix for the swap looking broken. Both view kinds render an
// <Image> at the same position in the tree, so without a key React reused a
// single <img> node and swapped its src and className together: the class
// change landed immediately, the new bitmap took a few hundred milliseconds,
// and in between the browser was still painting the OLD cutout under the new
// object-cover rules with the padding gone — the cutout appeared to lurch to
// a zoomed-in crop before the real photo showed up. Keyed, each bitmap can
// only ever be drawn with its own styling.
//
// Keying also resets `loaded` here, which is why this is a separate component
// rather than state on ProductStage: a key on the <Image> alone would remount
// the image but leave the flag stuck at true from the previous view.
function StageImage({
  view,
  alt,
  sizes,
}: {
  view: StageView;
  alt: string;
  sizes: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const isCutout = view.kind === "cutout";

  return (
    <Image
      src={view.url}
      alt={alt}
      fill
      sizes={sizes}
      quality={85}
      // A cached image can already be decoded before React attaches onLoad,
      // in which case that event never fires and the picture would sit at
      // opacity 0 forever. The ref catches that case on mount.
      ref={(el) => {
        if (el?.complete) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      style={
        isCutout
          ? {
              // Computed from the alpha silhouette, so it stays anchored to
              // the lamp's real outline whatever transparent margin the file
              // carries.
              filter:
                "drop-shadow(0 10px 10px rgba(58,46,54,0.22)) drop-shadow(0 26px 28px rgba(58,46,54,0.14))",
            }
          : undefined
      }
      // Fades up from the panel instead of snapping in, so the brief gap
      // while the next picture downloads reads as loading rather than as a
      // glitch.
      className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${
        isCutout ? "object-contain p-6" : "object-cover"
      }`}
    />
  );
}

// One fixed square panel, and every image conforms to it. No blurred backdrop
// behind the real photos, and no glow.
//
// Real photos are cropped to fill (object-cover): they come off a phone at
// whatever aspect ratio, and cropping is what makes every product page show a
// picture of exactly the same size and shape. Cutouts are the exception, and
// not for stylistic reasons: they are transparent PNGs, so fitting them shows
// no bars — the panel simply shows through — while cropping would zoom in and
// clip the lamp, since the transparent margin counts as image area.
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
    <div className="blob-photo relative aspect-square overflow-hidden bg-papier">
      {view === null ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <LampIllustration size="sm" />
          <p className="font-hand text-lg text-encre/50">photo à venir</p>
        </div>
      ) : (
        <StageImage key={view.url} view={view} alt={alt} sizes={sizes} />
      )}
    </div>
  );
}
