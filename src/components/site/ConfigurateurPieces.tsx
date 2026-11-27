"use client";

import { ApercuPlat } from "@/components/site/ApercuPlat";
import { inkOn, pale } from "@/lib/accueil";
import type { Horloge } from "@/lib/horloges";
import type { FilamentColor, ProductPart } from "@/lib/products";
import type { EtatHorloge } from "@/lib/useHorloge";

// Le choix des couleurs : vingt modèles tout prêts, puis l'atelier.
//
// Trois pièces et onze bobines font treize cent trente et une horloges ; six
// pièces en font presque deux millions. L'objet au-dessus — le dessin pour le
// Duo, la visionneuse 3D pour la Télé — se repeint à chaque clic : c'est lui
// qui remplace la photo, et c'est pour ça que la cliente peut choisir sans
// rien imaginer.
//
// ── Les vignettes sont dessinées, pas photographiées ───────────────────────
//
// Les cinq premiers modèles ont un rendu .webp tiré du modèle 3D. Les quinze
// autres n'en ont pas, et il aurait fallu remonter toute la chaîne de rendu
// pour les fabriquer. Inutile : `ApercuPlat` sait déjà dessiner l'horloge à
// plat dans n'importe quelles couleurs, c'est lui qui sert de doublure à la
// 3D pendant son chargement. On s'en sert ici pour les vingt, et une
// vingt-et-unième combinaison ajoutée dans horloges.ts s'affichera sans
// qu'on ait rien à fabriquer.
//
// ── Les deux étages, et pourquoi l'atelier reste visible ───────────────────
//
// Il y a eu une version où les six nuanciers étaient repliés derrière un
// bouton, et une autre sans aucun modèle. La patronne a tranché le 27
// novembre 2026 : les deux, et l'atelier bien en vue. C'est le bon arbitrage
// — on reconnaît un modèle qui plaît en deux secondes, et celles qui veulent
// vraiment leurs couleurs ne doivent pas avoir à deviner que c'est possible,
// puisque c'est précisément ce que la maison vend.
//
// Le nom de la teinte est écrit à côté du titre de la pièce plutôt que sous
// chaque pastille : soixante noms sur un téléphone deviendraient illisibles,
// et un seul — celui qui est choisi — dit tout. Les trois autres chemins vers
// le nom restent ouverts, comme pour les veilleuses : `aria-label`, `title`,
// et la ligne écrite. Voir ColorSwatches.

export type { ChoixPieces } from "@/lib/useHorloge";

export function ConfigurateurPieces({
  slug,
  parts,
  palette,
  horloge,
  etat,
  className = "",
}: {
  slug: string;
  parts: ProductPart[];
  palette: FilamentColor[];
  horloge: Horloge | null;
  etat: EtatHorloge;
  className?: string;
}) {
  if (parts.length === 0 || palette.length === 0) return null;

  const labelParSlot = new Map(parts.map((p) => [p.slot, p.label]));
  const zoneParSlot = new Map((horloge?.zones ?? []).map((z) => [z.slot, z]));
  const hexParNom = new Map(palette.map((c) => [c.name, c.hex]));
  const idees = horloge?.idees ?? [];

  return (
    <div className={className}>
      {/* ── Les modèles ────────────────────────────────────────────── */}
      {horloge && idees.length > 0 ? (
        <div>
          <p className="font-heading text-[15px] font-semibold">
            {idees.length} modèles tout prêts
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {idees.map((idee) => {
              const actif = etat.ideeActive === idee.nom;
              const couleurs: Record<string, string> = {};
              for (const [slot, nom] of Object.entries(idee.couleurs)) {
                const hex = hexParNom.get(nom);
                if (hex) couleurs[slot] = hex;
              }
              const fond = pale(couleurs[horloge.teinteSlot] ?? "#cccccc");
              return (
                <button
                  key={idee.nom}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => etat.appliquerIdee(idee.nom)}
                  className={`overflow-hidden rounded-2xl transition active:scale-95 ${
                    actif
                      ? "border-[3px] border-encre shadow-[0_6px_0_-1px_rgba(36,28,33,.3)]"
                      : "border-2 border-encre/20 hover:border-encre/55"
                  }`}
                  style={{ background: fond }}
                >
                  <ApercuPlat
                    slug={slug}
                    horloge={horloge}
                    couleurs={couleurs}
                    titre=""
                    className="block h-auto w-full"
                  />
                  <span
                    className="block truncate px-1 pb-1.5 font-heading text-[12px] font-semibold"
                    style={{ color: inkOn(fond) }}
                  >
                    {idee.nom}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── L'atelier ──────────────────────────────────────────────── */}
      {/* Encadré, sur son propre fond, avec son titre à lui : c'est ce que la
          maison vend vraiment, et dans la version précédente il se confondait
          avec le reste de la page. Visible sans qu'on ait à ouvrir quoi que
          ce soit — une section qu'il faut déplier n'est pas « mise en
          valeur », elle est cachée poliment. */}
      <div className="mt-6 rounded-[1.75rem] border-[3px] border-encre bg-[#fff4d6] p-4">
        <p className="font-heading text-[19px] leading-tight font-bold text-encre">
          Ou dessinez la vôtre
        </p>
        <p className="mt-1 text-sm text-encre/70">
          {parts.length} pièces, {palette.length} couleurs. Changez-en une seule et
          l&apos;horloge au-dessus la prend tout de suite.
        </p>

        {parts.map((part, index) => {
          const choisie = etat.choix[part.slot];
          const zone = zoneParSlot.get(part.slot);
          const chef = zone?.suit;
          const suit = Boolean(chef && etat.suivis[part.slot]);
          return (
            <div
              key={part.slot}
              className="mt-3 rounded-2xl border-2 border-encre/15 bg-papier px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                {/* Le numéro, comme dans le bon de commande juste en dessous.
                    Six nuanciers à plat sont un mur ; six étapes numérotées
                    sont une liste qu'on finit. */}
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-encre font-heading text-[13px] font-bold text-encre"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 font-heading text-[15px] font-semibold">
                  {part.label}
                </span>
                {choisie ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-full border border-encre/30"
                      style={{ background: choisie.hex }}
                    />
                    <span className="font-heading text-[14px] text-encre/70">
                      {choisie.name}
                    </span>
                  </span>
                ) : null}
              </div>

              {/* La case qui replie le nuancier. Cochée au départ : la cliente
                  n'a pas d'avis sur la couleur du support mural tant qu'on ne
                  lui demande pas, et lui demander coûte onze pastilles. */}
              {chef ? (
                <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2.5 pl-[38px] text-sm text-encre/75">
                  <input
                    type="checkbox"
                    checked={suit}
                    onChange={(e) => etat.basculerSuivi(part.slot, e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[var(--color-encre)]"
                  />
                  Même couleur que {(labelParSlot.get(chef) ?? chef).toLowerCase()}
                </label>
              ) : null}

              {!suit ? (
                <div
                  role="radiogroup"
                  aria-label={part.label}
                  className="mt-2.5 flex flex-wrap gap-1.5"
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

        {/* ── Les options ──────────────────────────────────────────── */}
        {(horloge?.options ?? []).map((opt) => (
          <label
            key={opt.id}
            className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-encre/15 bg-papier px-3 py-2 text-sm text-encre/75"
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
      </div>

      {/* ── Les avertissements ─────────────────────────────────────── */}
      {/* Doux, jamais bloquants. Une cliente a le droit de vouloir une horloge
          noire sur noire ; elle a seulement le droit de le savoir avant que le
          colis arrive. Dehors, sous l'encadré : sur fond jaune il se
          confondrait avec lui. */}
      {etat.avertissements.length > 0 ? (
        <div
          role="status"
          className="mt-3 rounded-2xl border-2 border-encre/20 bg-papier px-4 py-3 text-sm text-encre/80"
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
