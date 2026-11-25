"use client";

import type { Horloge } from "@/lib/horloges";
import type { FilamentColor, ProductPart } from "@/lib/products";
import type { EtatHorloge } from "@/lib/useHorloge";

// Le choix des couleurs, une ligne par pièce.
//
// Trois pièces et onze bobines font treize cent trente et une horloges ; six
// pièces en font presque deux millions. L'objet au-dessus — le dessin pour le
// Duo, la visionneuse 3D pour la Télé — se repeint à chaque clic : c'est lui
// qui remplace la photo, et c'est pour ça que la cliente peut choisir sans
// rien imaginer.
//
// Le nom de la teinte est écrit à côté du titre de la pièce plutôt que sous
// chaque pastille : soixante noms sur un téléphone deviendraient illisibles,
// et un seul — celui qui est choisi — dit tout. Les trois autres chemins vers
// le nom restent ouverts, comme pour les veilleuses : `aria-label`, `title`,
// et la ligne écrite. Voir ColorSwatches.
//
// L'ordre de la page n'est pas décoratif. Les idées viennent EN PREMIER :
// personne n'arrive avec six couleurs en tête, on reconnaît une combinaison
// qui plaît et on l'ajuste. Les réglages fins sont dessous, pour qui veut.

export type { ChoixPieces } from "@/lib/useHorloge";

export function ConfigurateurPieces({
  parts,
  palette,
  horloge,
  etat,
  className = "",
}: {
  parts: ProductPart[];
  palette: FilamentColor[];
  horloge: Horloge | null;
  etat: EtatHorloge;
  className?: string;
}) {
  if (parts.length === 0 || palette.length === 0) return null;

  const labelParSlot = new Map(parts.map((p) => [p.slot, p.label]));
  const zoneParSlot = new Map((horloge?.zones ?? []).map((z) => [z.slot, z]));
  const idees = horloge?.idees ?? [];

  return (
    <div className={className}>
      {/* ── Les idées ──────────────────────────────────────────────── */}
      {idees.length > 0 ? (
        <div>
          <p className="font-heading text-[15px] font-semibold">Des idées</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {idees.map((idee) => {
              const actif = etat.ideeActive === idee.nom;
              // Les pastilles de l'idée, dans l'ordre des pièces : on
              // reconnaît une combinaison à ses couleurs, pas à son nom.
              const points = parts
                .map((p) => palette.find((c) => c.name === idee.couleurs[p.slot])?.hex)
                .filter((h): h is string => Boolean(h));
              return (
                <button
                  key={idee.nom}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => etat.appliquerIdee(idee.nom)}
                  className={`flex min-h-11 items-center gap-2 rounded-full px-3 font-heading text-[14px] font-semibold transition active:scale-95 ${
                    actif
                      ? "border-2 border-encre bg-encre text-papier"
                      : "border-2 border-encre/20 bg-papier hover:border-encre/50"
                  }`}
                >
                  <span className="flex">
                    {points.map((hex, i) => (
                      <span
                        key={i}
                        className="h-3.5 w-3.5 rounded-full border border-encre/25"
                        style={{ background: hex, marginLeft: i === 0 ? 0 : -5 }}
                      />
                    ))}
                  </span>
                  {idee.nom}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Une ligne par pièce ────────────────────────────────────── */}
      {parts.map((part) => {
        const choisie = etat.choix[part.slot];
        const zone = zoneParSlot.get(part.slot);
        const chef = zone?.suit;
        const suit = Boolean(chef && etat.suivis[part.slot]);
        return (
          <div key={part.slot} className="mt-5">
            <p className="flex flex-wrap items-baseline gap-x-2 font-heading text-[15px] font-semibold">
              {part.label}
              {choisie ? (
                <span className="text-[14px] font-medium text-encre/60">{choisie.name}</span>
              ) : null}
            </p>

            {/* La case qui replie le nuancier. Cochée au départ : la cliente
                n'a pas d'avis sur la couleur du support mural tant qu'on ne
                lui demande pas, et lui demander coûte onze pastilles. */}
            {chef ? (
              <label className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-encre/75">
                <input
                  type="checkbox"
                  checked={suit}
                  onChange={(e) => etat.basculerSuivi(part.slot, e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[var(--color-encre)]"
                />
                Même couleur que « {(labelParSlot.get(chef) ?? chef).toLowerCase()} »
              </label>
            ) : null}

            {!suit ? (
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
                      onClick={() => etat.choisir(part.slot, couleur)}
                      className={`h-11 w-11 rounded-full transition active:scale-95 ${
                        actif
                          ? "border-[3px] border-encre shadow-[0_0_0_3px_var(--color-papier),0_0_0_5px_rgba(36,28,33,.25)]"
                          : "border-2 border-encre/25 hover:border-encre/60"
                      }`}
                      style={{ background: couleur.hex }}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* ── Les options ────────────────────────────────────────────── */}
      {(horloge?.options ?? []).map((opt) => (
        <label
          key={opt.id}
          className="mt-5 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-encre/75"
        >
          <input
            type="checkbox"
            checked={etat.options[opt.id] ?? opt.defaut}
            onChange={(e) => etat.basculerOption(opt.id, e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--color-encre)]"
          />
          <span>
            <span className="font-semibold text-encre">{opt.label}</span>{" "}
            <span className="text-encre/60">— {opt.detail}</span>
          </span>
        </label>
      ))}

      {/* ── Les avertissements ─────────────────────────────────────── */}
      {/* Doux, jamais bloquants. Une cliente a le droit de vouloir une horloge
          noire sur noire ; elle a seulement le droit de le savoir avant que le
          colis arrive. */}
      {etat.avertissements.length > 0 ? (
        <div
          role="status"
          className="mt-5 rounded-2xl border-2 border-encre/15 bg-[#fff4d6] px-4 py-3 text-sm text-encre/80"
        >
          {etat.avertissements.join(" ")}
        </div>
      ) : null}

      <p className="mt-4 text-center text-[13px] text-encre/50">
        Les couleurs à l&apos;écran sont très proches des bobines, sans être exactes.
      </p>
    </div>
  );
}
