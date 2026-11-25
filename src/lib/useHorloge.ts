"use client";

import { useCallback, useMemo, useState } from "react";
import type { Horloge } from "@/lib/horloges";
import type { FilamentColor, ProductPart } from "@/lib/products";

// L'état d'une horloge en train d'être composée.
//
// ── Le problème que ça règle ────────────────────────────────────────────
//
// Le Duo se choisit en trois couleurs, la Télé en six. Six nuanciers de onze
// pastilles dépliés l'un sous l'autre sur un téléphone, c'est un mur de
// soixante-six ronds avant d'arriver au bouton Commander — et la cliente n'a
// pas d'avis sur la couleur du support mural, qui se voit à peine.
//
// D'où deux idées, et elles sont dans le modèle plutôt que dans l'affichage :
//
//   « suivre »  — une zone peut prendre la couleur d'une autre, et c'est son
//                 état de départ. Le nuancier reste replié tant que la case
//                 est cochée. On passe de six décisions à trois, et les trois
//                 autres restent possibles pour qui les veut.
//   « idées »   — cinq combinaisons en un clic, dans les bobines qu'elle a
//                 vraiment. C'est le chemin le plus court entre arriver et
//                 vouloir : on ne choisit pas six couleurs, on en reconnaît
//                 une qui plaît, et on l'ajuste ensuite.
//
// ── Ce qui part dans la commande ────────────────────────────────────────
//
// Toujours la couleur EFFECTIVE de chaque pièce, jamais « la même que le
// cadre ». La Server Action exige une bobine nommée pour chaque pièce du
// produit, et surtout : c'est la patronne qui lit la commande, et elle doit
// savoir quoi mettre dans l'imprimante sans rien avoir à déduire.

export type ChoixPieces = Record<string, FilamentColor>;

export type EtatHorloge = {
  // La couleur effective de chaque pièce du produit, prête pour la commande.
  choix: ChoixPieces;
  // Les mêmes, en hex, par slot : ce que mange la visionneuse 3D.
  hexParSlot: Record<string, string>;
  // Quelles zones suivent une autre, par slot.
  suivis: Record<string, boolean>;
  options: Record<string, boolean>;
  // Les messages doux du moment (« les chiffres ont la couleur du cadran »).
  avertissements: string[];
  // Le nom de l'idée appliquée, si la combinaison actuelle en est une.
  ideeActive: string | null;
  choisir: (slot: string, couleur: FilamentColor) => void;
  basculerSuivi: (slot: string, suit: boolean) => void;
  basculerOption: (id: string, actif: boolean) => void;
  appliquerIdee: (nom: string) => void;
};

export function useHorloge({
  parts,
  palette,
  horloge,
}: {
  // Les pièces telles qu'elles sont en base : c'est elles qui décident de ce
  // qui est proposé et de ce qui doit figurer dans la commande.
  parts: ProductPart[];
  palette: FilamentColor[];
  // La géométrie, quand le produit en a une. Sans elle, tout fonctionne
  // encore : pas de case « même couleur », pas d'idée, pas d'option — un
  // nuancier par pièce, comme avant.
  horloge: Horloge | null;
}): EtatHorloge {
  const zones = useMemo(
    () => new Map((horloge?.zones ?? []).map((z) => [z.slot, z])),
    [horloge],
  );

  const parNom = useCallback(
    (nom: string | undefined) => (nom ? palette.find((c) => c.name === nom) : undefined),
    [palette],
  );

  // Les couleurs demandées, par slot, sous forme de nom de bobine. On garde le
  // NOM et pas l'objet : une bobine retirée du catalogue doit disparaître des
  // choix sans emporter l'état avec elle.
  const [brut, setBrut] = useState<Record<string, string>>(() => {
    const depart: Record<string, string> = {};
    parts.forEach((part, i) => {
      const voulu = zones.get(part.slot)?.defaut;
      const couleur = parNom(voulu) ?? palette[i % Math.max(palette.length, 1)];
      if (couleur) depart[part.slot] = couleur.name;
    });
    return depart;
  });

  // Cochées au départ pour toute zone qui peut suivre : c'est le réglage qui
  // demande le moins de travail à la cliente, et celui qui donne le résultat
  // le plus sûr (une aiguille de la couleur des chiffres se voit toujours).
  const [suivis, setSuivis] = useState<Record<string, boolean>>(() => {
    const depart: Record<string, boolean> = {};
    for (const part of parts) {
      const zone = zones.get(part.slot);
      if (zone?.suit) depart[part.slot] = true;
    }
    return depart;
  });

  const [options, setOptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((horloge?.options ?? []).map((o) => [o.id, o.defaut])),
  );

  // La couleur réelle d'une pièce : la sienne, ou celle de la zone qu'elle
  // suit. Le compteur de profondeur n'est pas de la superstition — une
  // configuration mal écrite (A suit B, B suit A) ferait sinon tourner la
  // page jusqu'à l'épuisement de la pile, sur le téléphone de la cliente.
  const resoudre = useMemo(() => {
    function chercher(slot: string, profondeur = 0): FilamentColor | undefined {
      if (profondeur > 8) return undefined;
      const zone = zones.get(slot);
      if (zone?.suit && suivis[slot]) return chercher(zone.suit, profondeur + 1);
      return parNom(brut[slot]);
    }
    return chercher;
  }, [zones, suivis, brut, parNom]);

  const choix = useMemo(() => {
    const out: ChoixPieces = {};
    parts.forEach((part, i) => {
      const c = resoudre(part.slot) ?? palette[i % Math.max(palette.length, 1)];
      if (c) out[part.slot] = c;
    });
    return out;
  }, [parts, resoudre, palette]);

  const hexParSlot = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [slot, c] of Object.entries(choix)) out[slot] = c.hex;
    return out;
  }, [choix]);

  // Les règles portent sur la couleur EFFECTIVE, pas sur celle demandée :
  // des chiffres qui « suivent le cadre » et un cadran de la couleur du cadre
  // donnent des chiffres invisibles, et aucune des deux cases cochées ne le
  // dit. C'est le résultat qu'on regarde.
  const avertissements = useMemo(() => {
    if (!horloge) return [];
    return horloge.regles
      .filter((r) => {
        const a = choix[r.siEgal[0]];
        const b = choix[r.siEgal[1]];
        return a != null && b != null && a.id === b.id;
      })
      .map((r) => r.message);
  }, [horloge, choix]);

  const choisir = useCallback((slot: string, couleur: FilamentColor) => {
    setBrut((actuel) => ({ ...actuel, [slot]: couleur.name }));
    // Choisir une couleur pour une pièce, c'est décider qu'elle ne suit plus.
    // Le cas n'arrive pas par le nuancier, qui est replié tant qu'elle suit,
    // mais il arrivera le jour où une autre commande appellera ceci.
    setSuivis((actuel) => (actuel[slot] ? { ...actuel, [slot]: false } : actuel));
  }, []);

  const basculerSuivi = useCallback(
    (slot: string, suit: boolean) => {
      // En décochant, on sème la pièce avec la couleur qu'elle avait à
      // l'instant même : le nuancier s'ouvre sur la bonne pastille, et
      // l'horloge ne change pas de tête au moment où on ouvre le choix.
      if (!suit) {
        const actuelle = resoudre(slot);
        if (actuelle) setBrut((a) => ({ ...a, [slot]: actuelle.name }));
      }
      setSuivis((a) => ({ ...a, [slot]: suit }));
    },
    [resoudre],
  );

  const basculerOption = useCallback((id: string, actif: boolean) => {
    setOptions((a) => ({ ...a, [id]: actif }));
  }, []);

  const appliquerIdee = useCallback(
    (nom: string) => {
      const idee = horloge?.idees.find((i) => i.nom === nom);
      if (!idee) return;
      setBrut((actuel) => ({ ...actuel, ...idee.couleurs }));
      // Une idée qui donne la même couleur à une zone et à celle qu'elle suit
      // recoche la case : sinon la page afficherait un nuancier déplié pour
      // un choix que la cliente n'a pas fait.
      setSuivis(() => {
        const out: Record<string, boolean> = {};
        for (const part of parts) {
          const zone = zones.get(part.slot);
          if (!zone?.suit) continue;
          out[part.slot] = idee.couleurs[part.slot] === idee.couleurs[zone.suit];
        }
        return out;
      });
    },
    [horloge, parts, zones],
  );

  const ideeActive = useMemo(() => {
    if (!horloge) return null;
    const actuelle = horloge.idees.find((i) =>
      horloge.zones.every((z) => choix[z.slot]?.name === i.couleurs[z.slot]),
    );
    return actuelle?.nom ?? null;
  }, [horloge, choix]);

  return {
    choix,
    hexParSlot,
    suivis,
    options,
    avertissements,
    ideeActive,
    choisir,
    basculerSuivi,
    basculerOption,
    appliquerIdee,
  };
}
