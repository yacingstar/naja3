import { inkOn } from "@/lib/accueil";

// La Télé dessinée à plat, dans les couleurs choisies.
//
// ── Pourquoi un dessin alors qu'il y a la 3D ────────────────────────────
//
// Trois endroits où un moteur 3D n'a rien à faire :
//
//   1. pendant le chargement. Le modèle pèse 740 Ko ; sur une 3G algérienne
//      ça fait plusieurs secondes pendant lesquelles la cliente choisit déjà
//      ses couleurs. Une image figée qui ne bouge pas quand on clique donne
//      l'impression d'une page cassée. Ce dessin-ci se repeint tout de suite.
//   2. sans WebGL. Vieux téléphone, navigateur bridé : il reste un aperçu
//      exact, pas un message d'excuse.
//   3. sur une vignette de boutique ou un récapitulatif de commande, où
//      démarrer un GPU pour deux cents pixels serait absurde.
//
// ── D'où viennent les cotes ─────────────────────────────────────────────
//
// Du modèle lui-même, pas d'un coup d'œil : chaque node du .glb porte ses
// bornes, lues en millimètres et reportées ici telles quelles.
//
//   cadre    200 × 180 mm, plus une oreille de 34 mm à gauche
//   cadran   176 × 156 mm
//   chiffres jusqu'à 71 mm en largeur, 61 mm en hauteur
//   aiguilles heures 43 mm, minutes 58 mm ; axe ⌀ 6,4
//   support  10,7 mm d'épaisseur, 100 mm de haut, à 139 mm de l'axe
//
// Le repère est celui du modèle : l'axe des aiguilles est à 0 ; 0, le mur est
// à gauche. En SVG l'axe Y descend, donc midi est en haut avec un y négatif.

export type TeleCouleurs = {
  cadre: string;
  cadran: string;
  chiffres: string;
  heures: string;
  minutes: string;
  support: string;
};

// Un liseré qui se voit sur TOUTES les couleurs, y compris noir sur noir.
// Même raison que pour le Duo : les pièces existent toujours, elles doivent
// rester lisibles même quand la cliente choisit six fois la même teinte.
export function lisere(surQuoi: string): string {
  return inkOn(surQuoi) === "#241c21" ? "rgba(27,20,16,.28)" : "rgba(255,253,247,.34)";
}

const arrondi = (v: number) => Math.round(v * 100) / 100;

// Les huit bâtonnets, aux heures que les chiffres n'occupent pas. Ils sont sur
// une ellipse et non sur un cercle : le cadran est plus large que haut, un
// cercle les collerait au bord en haut et les laisserait flotter sur les côtés.
const MARQUES = [1, 2, 4, 5, 7, 8, 10, 11];
const RX = 63;
const RY = 54;

export function TeleApercu({
  cadre,
  cadran,
  chiffres,
  heures,
  minutes,
  support,
  className = "",
  titre,
}: TeleCouleurs & { className?: string; titre?: string }) {
  return (
    <svg
      // Assez large pour le support à gauche (−139) et le cadre à droite
      // (+100), centré sur l'ensemble plutôt que sur l'axe des aiguilles.
      viewBox="-152 -126 264 252"
      className={className}
      role="img"
      aria-label={titre ?? "Aperçu de l'horloge"}
    >
      {/* Le support mural, derrière tout le reste. */}
      <rect
        x={-139}
        y={-55}
        width={10.7}
        height={100}
        rx={4}
        fill={support}
        stroke={lisere(support)}
        strokeWidth={0.9}
      />

      {/* L'ombre portée du corps sur le mur : c'est elle qui dit que
          l'horloge dépasse au lieu d'être posée à plat. */}
      <g transform="translate(3 6)" fill="rgba(0,0,0,.18)">
        <rect x={-134} y={-34} width={44} height={68} rx={16} />
        <rect x={-100} y={-90} width={200} height={180} rx={34} />
      </g>

      {/* L'oreille qui porte le badge, puis le corps. Deux rectangles plutôt
          qu'un seul chemin : ils se recouvrent, la jointure ne se voit pas,
          et les cotes restent lisibles. */}
      <g fill={cadre} stroke={lisere(cadre)} strokeWidth={1}>
        <rect x={-134} y={-34} width={48} height={68} rx={16} />
        <rect x={-100} y={-90} width={200} height={180} rx={34} />
      </g>

      {/* Le badge « Naja » collé sur l'oreille, de la couleur du cadran. */}
      <rect
        x={-125}
        y={-23}
        width={18}
        height={46}
        rx={9}
        fill={cadran}
        stroke={lisere(cadran)}
        strokeWidth={0.8}
      />

      {/* Le cadran. */}
      <rect
        x={-88}
        y={-78}
        width={176}
        height={156}
        rx={24}
        fill={cadran}
        stroke={lisere(cadran)}
        strokeWidth={0.9}
      />

      {/* Chiffres et bâtonnets. */}
      <g fill={chiffres}>
        <g
          className="font-heading"
          fontWeight="700"
          fontSize={34}
          textAnchor="middle"
          stroke={lisere(cadran)}
          strokeWidth={0.6}
        >
          <text x={0} y={-40}>12</text>
          <text x={0} y={66}>6</text>
          <text x={66} y={13}>3</text>
          <text x={-66} y={13}>9</text>
        </g>
        {MARQUES.map((h) => {
          const angle = ((h * 30 - 90) * Math.PI) / 180;
          const x = arrondi(RX * Math.cos(angle));
          const y = arrondi(RY * Math.sin(angle));
          return (
            <rect
              key={h}
              x={arrondi(x - 2.6)}
              y={arrondi(y - 7.5)}
              width={5.2}
              height={15}
              rx={2.6}
              stroke={lisere(cadran)}
              strokeWidth={0.6}
              transform={`rotate(${h * 30} ${x} ${y})`}
            />
          );
        })}
      </g>

      {/* Les aiguilles, à dix heures dix — la position qui dégage le centre et
          sur laquelle toutes les horloges sont photographiées. Le dessin ne
          donne pas l'heure ; c'est le rôle de la 3D, qui la met à l'heure de
          la visiteuse. Ici, l'objet doit seulement être reconnaissable. */}
      <g transform="rotate(-60)">
        <rect
          x={-7}
          y={-43}
          width={14}
          height={53.2}
          rx={7}
          fill={heures}
          stroke={lisere(cadran)}
          strokeWidth={0.7}
        />
      </g>
      <g transform="rotate(60)">
        <rect
          x={-5}
          y={-58}
          width={10}
          height={75.8}
          rx={5}
          fill={minutes}
          stroke={lisere(cadran)}
          strokeWidth={0.7}
        />
      </g>
      <circle cx={0} cy={0} r={6.4} fill={minutes} stroke={lisere(cadran)} strokeWidth={0.7} />
    </svg>
  );
}
