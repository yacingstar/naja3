// La géométrie des horloges : quelle pièce du modèle 3D porte quelle couleur.
//
// ── Pourquoi ce fichier existe, et pourquoi ce n'est PAS de la base ──────
//
// Le cahier des charges fourni avec la gamme demandait de tout mettre dans un
// JSON par horloge : prix, couleurs, pièces, le tout lu par la page. Le site ne
// peut pas fonctionner comme ça, pour une raison simple : le prix et le stock
// vivent déjà dans Supabase, la patronne les modifie dans son admin, et la
// Server Action qui enregistre une commande les relit pour vérifier ce qu'elle
// facture. Un prix écrit dans un fichier serait un deuxième prix, et deux prix
// finissent toujours par se contredire.
//
// Le partage est donc celui-ci :
//
//   la base   → ce qui se vend et ce qui se décide : nom, prix, description,
//               les pièces (`product_parts`) et la palette (`filament_colors`),
//               tout ce que l'admin modifie et que le serveur revalide ;
//   ce fichier → ce qui ne se décide pas : la forme. Quelle node du .glb
//               appartient à quelle pièce, où se place la caméra, quelle
//               aiguille tourne dans quel sens. Changer ça voudrait dire
//               réimprimer l'horloge.
//
// Les `slot` ci-dessous sont EXACTEMENT ceux de `product_parts` en base : c'est
// la clé qui joint les deux moitiés. Un slot qui ne correspond à rien en base
// n'est jamais proposé à la cliente ; une pièce en base sans slot ici reste
// choisissable, elle ne repeint simplement rien dans la 3D.
//
// ── Ajouter une horloge ─────────────────────────────────────────────────
// 1. déposer son .glb dans `public/horloges/`, pièces nommées ;
// 2. ajouter une entrée ici ;
// 3. créer le produit en base avec ses `product_parts` aux mêmes slots.
// Rien d'autre : la page produit et le configurateur se construisent seuls.

export type ZoneHorloge = {
  // La même chaîne que `product_parts.slot` en base.
  slot: string;
  // Les nodes du .glb que cette zone repeint.
  nodes: string[];
  // Le nom de bobine souhaité au départ, tel qu'il est écrit dans
  // `filament_colors.name`. Si la bobine a disparu du catalogue, la page
  // retombe sur la première disponible — jamais d'écran vide.
  defaut: string;
  // Le slot que cette zone peut suivre : une case « Même couleur que … »
  // apparaît alors, cochée au départ, et le nuancier reste replié tant
  // qu'elle l'est. Six nuanciers dépliés sur un téléphone, c'est un mur.
  suit?: string;
};

export type VueHorloge = {
  id: string;
  label: string;
  // Direction depuis le centre de l'objet ; normalisée à l'usage.
  direction: [number, number, number];
  // Distance, en multiples du rayon de l'objet.
  distance: number;
};

export type OptionHorloge = {
  id: string;
  label: string;
  detail: string;
  defaut: boolean;
  // Les nodes à montrer / cacher quand l'option est active. L'inverse quand
  // elle ne l'est pas : deux variantes de la même pièce vivent dans le .glb,
  // une seule est visible à la fois.
  montrer: string[];
  cacher: string[];
};

export type Horloge = {
  // Le modèle, servi depuis `public/`.
  modele: string;
  // La pièce dont la couleur déteint sur le cadre de la page, comme la photo
  // d'une veilleuse donne sa couleur à la fiche. On prend la pièce la plus
  // large et la plus claire des deux — c'est elle qu'on voit de loin.
  teinteSlot: string;
  // Les teintes du catalogue : celles dans lesquelles l'horloge se montre sur
  // une carte de boutique. Des hex et non des noms de bobines, parce qu'une
  // carte se rend sur le serveur sans rien demander à la base — sinon chaque
  // vignette coûterait une lecture de la palette.
  //
  // La contrepartie : ces six valeurs sont une COPIE. Si la patronne corrige
  // le bleu dans son admin, les cartes gardent l'ancien ton jusqu'à ce qu'on
  // corrige ici. C'est décoratif et assumé — la fiche produit, elle, lit la
  // vraie palette. Garder ces teintes égales à la première idée ci-dessous :
  // la carte et la première vue de la fiche montrent alors le même objet.
  vitrine: Record<string, string>;
  // L'image montrée pendant le chargement, et si la 3D ne démarre pas du
  // tout (vieux téléphone, WebGL coupé). Jamais un écran vide.
  secours: string;
  zones: ZoneHorloge[];
  // Les nodes dont la teinte se déduit d'une zone plutôt que d'être choisie :
  // le fond gravé du logo, plus sombre pour rester lisible.
  teintesDerivees: Array<{ node: string; depuis: string; multiplier: number }>;
  // Ce qui n'est pas la pièce vendue : le bout de mur de la Télé, qui montre
  // comment elle se fixe. On le colore une fois et on n'y touche plus.
  decorFixe: Array<{ node: string; hex: string }>;
  options: OptionHorloge[];
  vues: VueHorloge[];
  // Une entrée par cadran. La Télé en a deux, et le second se regarde
  // de derrière : ses aiguilles tournent donc dans l'autre sens à l'écran.
  aiguilles: Array<{ heures: string; minutes: string; sens: 1 | -1 }>;
  // Les nodes qui décident du cadrage. Le mur et la patte d'accroche en sont
  // exclus : sans ça la caméra recule pour tout contenir et l'horloge, qui
  // est le sujet, devient un timbre-poste.
  cadrage: string[];
  // Les nodes qui gardent un ombrage lissé. Toutes les autres pièces passent
  // en facettes nettes, ce qui donne le rendu « plastique imprimé ».
  lisses: string[];
  // Des avertissements doux, jamais bloquants : la cliente a le droit de
  // vouloir une horloge noire sur noire, elle a seulement le droit de savoir.
  regles: Array<{ siEgal: [string, string]; message: string }>;
  // Des combinaisons en un clic. Les couleurs sont des noms de bobines.
  //
  // `image` est un rendu figé de cette combinaison, fabriqué depuis le modèle
  // 3D lui-même. Il sert à l'accueil, qui montre l'horloge en grand et laisse
  // changer de coloris d'un doigt sans démarrer de moteur 3D : cinq images de
  // trente kilos valent mieux qu'un mégaoctet de three.js sur la page la plus
  // visitée du site. Absente, la combinaison reste proposée sur la fiche,
  // elle n'apparaît simplement pas à l'accueil.
  idees: Array<{ nom: string; couleurs: Record<string, string>; image?: string }>;
};

// ── Le Duo ───────────────────────────────────────────────────────────────
// Deux formes ondulées superposées. Trois pièces, une seule face.
//
// RETIRÉ DU CATALOGUE le 25 novembre 2026, à la demande de la patronne : la
// ligne `products` a été supprimée (aucune commande ne la touchait), et une
// sauvegarde du produit, de son coloris et de ses trois pièces a été gardée.
// Tout le reste — ce bloc, le modèle duo.glb, le dessin HorlogeApercu — est
// laissé en place : recréer la ligne en base suffirait à remettre la fiche
// en ligne telle quelle. Rien ici n'est chargé tant que le produit n'existe
// pas.
const DUO: Horloge = {
  modele: "/horloges/duo.glb",
  teinteSlot: "avant",
  vitrine: { fond: "#1b4d2e", avant: "#46b65a", aiguilles: "#1b4d2e" },
  secours: "/horloges/duo-foret.webp",
  zones: [
    // `fond_logo` est la même pièce que `fond` avec « Naja » en relief, et
    // `accroche` la patte collée au dos : trois nodes, une seule couleur,
    // parce que c'est une seule pièce imprimée.
    { slot: "fond", nodes: ["fond", "fond_logo", "accroche"], defaut: "Vert foncé" },
    { slot: "avant", nodes: ["avant"], defaut: "Vert clair" },
    {
      slot: "aiguilles",
      nodes: ["reperes", "aiguille_heures", "aiguille_minutes", "axe"],
      defaut: "Vert foncé",
      suit: "fond",
    },
  ],
  teintesDerivees: [{ node: "logo_dos", depuis: "fond", multiplier: 0.55 }],
  decorFixe: [],
  options: [
    {
      id: "logo",
      label: "Logo Naja visible",
      detail: "en relief sur la forme arrière",
      defaut: false,
      montrer: ["fond_logo"],
      cacher: ["fond"],
    },
  ],
  vues: [
    { id: "trois", label: "3/4", direction: [0.55, 0.18, 1], distance: 2.95 },
    { id: "face", label: "Face", direction: [0, 0, 1], distance: 2.95 },
    { id: "dos", label: "Dos", direction: [-0.15, 0.08, -1], distance: 2.95 },
  ],
  aiguilles: [{ heures: "aiguille_heures", minutes: "aiguille_minutes", sens: -1 }],
  cadrage: ["fond"],
  lisses: ["reperes"],
  regles: [
    {
      siEgal: ["fond", "avant"],
      message: "Choisissez deux couleurs différentes pour garder l'effet Duo.",
    },
  ],
  // Cinq combinaisons, et toutes dans les bobines que la patronne a vraiment
  // (sa liste du 25 novembre 2026). Le dossier fourni en proposait d'autres —
  // bordeaux, crème, sauge, lilas, terracotta — qu'elle n'a pas : une idée
  // qu'on ne peut pas imprimer n'est pas une idée, c'est une déception.
  idees: [
    { nom: "Forêt", couleurs: { fond: "Vert foncé", avant: "Vert clair", aiguilles: "Vert foncé" } },
    { nom: "Cobalt", couleurs: { fond: "Bleu", avant: "Jaune", aiguilles: "Bleu" } },
    { nom: "Nuit", couleurs: { fond: "Noir", avant: "Blanc", aiguilles: "Noir" } },
    { nom: "Braise", couleurs: { fond: "Rouge", avant: "Orange", aiguilles: "Rouge" } },
    { nom: "Dragée", couleurs: { fond: "Violet", avant: "Rose", aiguilles: "Violet" } },
  ],
};

// ── La Télé ──────────────────────────────────────────────────────────────
// Double face, fixée au mur par le côté comme un panneau de gare. Chaque
// pièce existe deux fois dans le modèle, `_A` devant et `_B` derrière, et
// porte la même couleur : c'est une seule pièce imprimée deux fois.
const TELE: Horloge = {
  modele: "/horloges/tele.glb",
  teinteSlot: "cadre",
  vitrine: {
    cadre: "#1356c9",
    cadran: "#f4f2ed",
    chiffres: "#1356c9",
    heures: "#f88112",
    minutes: "#1356c9",
    support: "#1356c9",
  },
  secours: "/horloges/tele-originale.webp",
  zones: [
    { slot: "cadre", nodes: ["cadre_A", "cadre_B"], defaut: "Bleu" },
    {
      slot: "cadran",
      // Les badges « Naja » collés sur la patte sortent de la même bobine que
      // le cadran : ils suivent donc sans que ce soit un choix de plus.
      nodes: ["cadran_A", "cadran_B", "badge_A", "badge_B"],
      defaut: "Blanc",
    },
    { slot: "chiffres", nodes: ["chiffres_A", "chiffres_B"], defaut: "Bleu", suit: "cadre" },
    { slot: "heures", nodes: ["aiguille_heures_A", "aiguille_heures_B"], defaut: "Orange" },
    {
      slot: "minutes",
      nodes: ["aiguille_minutes_A", "aiguille_minutes_B", "axe_A", "axe_B"],
      defaut: "Bleu",
      suit: "chiffres",
    },
    { slot: "support", nodes: ["support"], defaut: "Bleu", suit: "cadre" },
  ],
  teintesDerivees: [],
  // Le mur n'est pas vendu : il est là pour qu'on comprenne d'un coup d'œil
  // que cette horloge se fixe par le côté et se lit des deux bouts du couloir.
  decorFixe: [{ node: "mur", hex: "#ece6dc" }],
  options: [],
  vues: [
    { id: "trois", label: "3/4", direction: [0.6, 0.2, 1], distance: 3.3 },
    { id: "face_a", label: "Face 1", direction: [0, 0, 1], distance: 3.4 },
    { id: "face_b", label: "Face 2", direction: [0, 0, -1], distance: 3.4 },
    { id: "cote", label: "Au mur", direction: [1.6, 0.35, 0.55], distance: 3.7 },
  ],
  aiguilles: [
    { heures: "aiguille_heures_A", minutes: "aiguille_minutes_A", sens: -1 },
    // Vue de derrière, une horloge tourne à l'envers. C'est la seule façon
    // d'avoir la bonne heure des deux côtés.
    { heures: "aiguille_heures_B", minutes: "aiguille_minutes_B", sens: 1 },
  ],
  cadrage: ["cadre_A", "cadre_B", "support"],
  lisses: [],
  regles: [
    {
      siEgal: ["chiffres", "cadran"],
      message: "Les chiffres ont la couleur du cadran : on ne les verra presque pas.",
    },
    {
      siEgal: ["heures", "cadran"],
      message: "L'aiguille des heures a la couleur du cadran : on ne la verra presque pas.",
    },
    {
      siEgal: ["minutes", "cadran"],
      message: "L'aiguille des minutes a la couleur du cadran : on ne la verra presque pas.",
    },
  ],
  idees: [
    {
      nom: "Originale",
      image: "/horloges/tele-originale.webp",
      couleurs: {
        cadre: "Bleu",
        cadran: "Blanc",
        chiffres: "Bleu",
        heures: "Orange",
        minutes: "Bleu",
        support: "Bleu",
      },
    },
    {
      nom: "Gare",
      image: "/horloges/tele-gare.webp",
      couleurs: {
        cadre: "Noir",
        cadran: "Blanc",
        chiffres: "Noir",
        heures: "Rouge",
        minutes: "Noir",
        support: "Noir",
      },
    },
    {
      nom: "Jardin",
      image: "/horloges/tele-jardin.webp",
      couleurs: {
        cadre: "Vert foncé",
        cadran: "Blanc",
        chiffres: "Vert foncé",
        heures: "Vert clair",
        minutes: "Vert foncé",
        support: "Vert foncé",
      },
    },
    {
      nom: "Soleil",
      image: "/horloges/tele-soleil.webp",
      couleurs: {
        cadre: "Jaune",
        cadran: "Blanc",
        chiffres: "Bleu",
        heures: "Orange",
        minutes: "Bleu",
        support: "Jaune",
      },
    },
    // Violet franc plutôt que rose sur rose : la version précédente mettait
    // des chiffres « Rose bonbon » sur un cadre « Rose », et à deux mètres de
    // distance — la distance à laquelle on lit une horloge — les deux teintes
    // n'en faisaient plus qu'une.
    {
      nom: "Bonbon",
      image: "/horloges/tele-bonbon.webp",
      couleurs: {
        cadre: "Violet",
        cadran: "Blanc",
        chiffres: "Violet",
        heures: "Rose bonbon",
        minutes: "Violet",
        support: "Violet",
      },
    },
  ],
};

// La clé est le `slug` du produit en base.
export const HORLOGES: Record<string, Horloge> = {
  "horloge-duo": DUO,
  "horloge-tele": TELE,
};

export function horlogePourSlug(slug: string): Horloge | null {
  return HORLOGES[slug] ?? null;
}
