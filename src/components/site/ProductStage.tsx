import Image from "next/image";
import { LampIllustration } from "@/components/site/LampIllustration";

export type StageView =
  | { kind: "cutout"; url: string }
  | { kind: "photo"; url: string };

// One fixed square panel, and every image conforms to it. No blurred backdrop
// behind the real photos any more, and no glow.
//
// Real photos are cropped to fill (object-cover): they come off a phone at
// whatever aspect ratio, and cropping is what makes every product page show a
// picture of exactly the same size and shape. The alternative — fitting them
// inside — is what left cream bars down the sides and prompted the blur in the
// first place. Cropping trims the edges of a non-square shot, which is nearly
// always backdrop; if a lamp ever gets clipped, the fix is to re-crop that
// source photo squarer rather than to reintroduce letterboxing here.
//
// Cutouts are the one exception, and not for stylistic reasons: they are
// transparent PNGs, so fitting them produces no bars to look at — the panel
// simply shows through. Cropping them would zoom into the lamp and cut its
// top and bottom off, since the transparent margin counts as image area.
// They keep a drop-shadow so the lamp reads as sitting on the panel rather
// than floating; that is a shadow, not an aura.
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
      ) : view.kind === "cutout" ? (
        <Image
          src={view.url}
          alt={alt}
          fill
          sizes={sizes}
          quality={85}
          // Computed from the alpha silhouette, so it stays anchored to the
          // lamp's real outline whatever transparent margin the file carries.
          style={{
            filter:
              "drop-shadow(0 10px 10px rgba(58,46,54,0.22)) drop-shadow(0 26px 28px rgba(58,46,54,0.14))",
          }}
          className="object-contain p-6"
        />
      ) : (
        <Image
          src={view.url}
          alt={alt}
          fill
          sizes={sizes}
          quality={85}
          className="object-cover"
        />
      )}
    </div>
  );
}
