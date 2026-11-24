import { inkOn } from "@/lib/accueil";
import {
  HORLOGE_AVANT,
  HORLOGE_FOND,
  HORLOGE_MARCHE,
  HORLOGE_RAYON_REPERES,
} from "@/components/site/horlogeChemins";

// L'horloge dessinée dans les couleurs choisies.
//
// C'est la photo du produit, et il n'y en aura jamais d'autre : une horloge
// à trois couleurs libres fait mille combinaisons, et neuf cent quatre-vingt
// dix-neuf d'entre elles ne seront jamais photographiées. Un dessin exact
// vaut mieux qu'une photo d'une autre horloge que la sienne.
//
// Pas de `"use client"` : rien ici n'a d'état, donc le composant se rend
// aussi bien sur le serveur (carte de la boutique, récapitulatif de commande,
// admin) que dans le configurateur, où il se re-rend à chaque clic.
//
// La silhouette vient des fichiers d'impression — voir horlogeChemins.ts.

export type HorlogeCouleurs = {
  fond: string;
  avant: string;
  aiguilles: string;
};

// Un liseré qui se voit sur TOUTES les couleurs, y compris noir sur noir.
// Sans lui, une horloge « tout noir » serait une tache : les trois pièces
// existent toujours, elles doivent rester lisibles même quand la cliente
// choisit trois fois la même teinte.
const arrondi = (v: number) => Math.round(v * 100) / 100;

function lisere(surQuoi: string): string {
  return inkOn(surQuoi) === "#241c21" ? "rgba(27,20,16,.28)" : "rgba(255,253,247,.34)";
}

export function HorlogeApercu({
  fond,
  avant,
  aiguilles,
  className = "",
  titre,
}: HorlogeCouleurs & { className?: string; titre?: string }) {
  const reperes = [];
  for (let h = 0; h < 12; h++) {
    const angle = ((h * 30 - 90) * Math.PI) / 180; // midi en haut
    // Arrondi au centième de millimètre, et ce n'est pas de la coquetterie :
    // Node et le navigateur n'écrivent pas un flottant de la même façon
    // (-67.54998149518619 d'un côté, -67.5499814951862 de l'autre), et React
    // signale alors une divergence d'hydratation sur chaque perle. Deux
    // décimales suffisent très largement pour une pièce de 24 cm.
    const x = arrondi(HORLOGE_RAYON_REPERES * Math.cos(angle));
    const y = arrondi(HORLOGE_RAYON_REPERES * Math.sin(angle));
    reperes.push(
      h % 3 === 0 ? (
        // Les quatre bâtonnets, à 12, 3, 6 et 9 heures.
        <rect
          key={h}
          x={arrondi(x - 3.05)}
          y={arrondi(y - 9.55)}
          width={6.1}
          height={19.1}
          rx={3.05}
          fill={aiguilles}
          stroke={lisere(avant)}
          strokeWidth={0.8}
          transform={`rotate(${h * 30} ${x} ${y})`}
        />
      ) : (
        // Les huit perles.
        <circle
          key={h}
          cx={x}
          cy={y}
          r={3.45}
          fill={aiguilles}
          stroke={lisere(avant)}
          strokeWidth={0.8}
        />
      ),
    );
  }

  return (
    <svg
      viewBox="-124 -124 248 248"
      className={className}
      role="img"
      aria-label={titre ?? "Aperçu de l'horloge"}
    >
      {/* La forme arrière. */}
      <path d={HORLOGE_FOND} fill={fond} />

      {/* L'ombre portée de l'avant sur le fond : les deux pièces sont
          collées l'une sur l'autre, l'avant dépasse de 3 mm en épaisseur.
          Un décalage suffit, un filtre SVG coûterait cher sur une page de
          boutique qui en affiche plusieurs. */}
      <path d={HORLOGE_AVANT} fill="rgba(0,0,0,.22)" transform="translate(1.6 2.6)" />

      {/* La forme avant, et la marche de 1 mm qui l'entoure. */}
      <path d={HORLOGE_AVANT} fill={avant} stroke={lisere(fond)} strokeWidth={0.9} />
      <path d={HORLOGE_MARCHE} fill="rgba(255,255,255,.12)" />

      {reperes}

      {/* Les aiguilles, à dix heures dix — la position qui dégage le centre
          et sur laquelle toutes les horloges sont photographiées. */}
      <g fill={aiguilles} stroke={lisere(avant)} strokeWidth={0.8}>
        <g transform="rotate(-60)">
          <rect x={-3} y={-47} width={6} height={56} rx={3} />
        </g>
        <g transform="rotate(60)">
          <rect x={-2.8} y={-64} width={5.6} height={74} rx={2.8} />
        </g>
        <circle cx={0} cy={0} r={6.4} />
      </g>
    </svg>
  );
}
