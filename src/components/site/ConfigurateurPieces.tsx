"use client";

import type { FilamentColor, ProductPart } from "@/lib/products";

// Le choix des couleurs, une ligne par pièce.
//
// Trois pièces et dix bobines font mille horloges. Le dessin au-dessus (voir
// HorlogeApercu) se repeint à chaque clic : c'est lui qui remplace la photo,
// et c'est pour ça que la cliente peut choisir sans rien imaginer.
//
// Le nom de la teinte est écrit à côté du titre de la pièce plutôt que sous
// chaque pastille : trente noms sur un téléphone deviendraient illisibles, et
// un seul — celui qui est choisi — dit tout. Les trois autres chemins vers le
// nom restent ouverts, comme pour les veilleuses : `aria-label`, `title`, et
// la ligne écrite. Voir ColorSwatches.

export type ChoixPieces = Record<string, FilamentColor>;

export function ConfigurateurPieces({
  parts,
  palette,
  choix,
  onChoisir,
  className = "",
}: {
  parts: ProductPart[];
  palette: FilamentColor[];
  choix: ChoixPieces;
  onChoisir: (slot: string, couleur: FilamentColor) => void;
  className?: string;
}) {
  if (parts.length === 0 || palette.length === 0) return null;

  return (
    <div className={className}>
      {parts.map((part) => {
        const choisie = choix[part.slot];
        return (
          <div key={part.slot} className="mt-5 first:mt-0">
            <p className="flex flex-wrap items-baseline gap-x-2 font-heading text-[15px] font-semibold">
              {part.label}
              {choisie ? (
                <span className="text-[14px] font-medium text-encre/60">{choisie.name}</span>
              ) : null}
            </p>
            <div
              role="radiogroup"
              aria-label={part.label}
              className="mt-2 flex flex-wrap gap-2"
            >
              {palette.map((couleur) => {
                const actif = choisie?.id === couleur.id;
                return (
                  <button
                    key={couleur.id}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    aria-label={`${part.label} : ${couleur.name}`}
                    title={couleur.name}
                    onClick={() => onChoisir(part.slot, couleur)}
                    className={`h-9 w-9 rounded-full transition active:scale-95 ${
                      actif
                        ? "border-[3px] border-encre shadow-[0_0_0_3px_var(--color-papier),0_0_0_5px_rgba(36,28,33,.25)]"
                        : "border-2 border-encre/25 hover:border-encre/60"
                    }`}
                    style={{ background: couleur.hex }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
