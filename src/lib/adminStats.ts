import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/orderStatus";
import { normalizePhone } from "@/lib/phone";

// Tous les chiffres de la gestion : ceux de l'accueil et ceux de la page
// Statistiques. Une seule lecture des commandes avec leurs lignes, puis tout
// est calculé en mémoire. À quelques centaines de commandes c'est plus rapide
// qu'une requête d'agrégat par chiffre, et surtout c'est lisible : la règle de
// chaque calcul est écrite ici, pas répartie dans du SQL. À revoir le jour où
// la boutique passe le millier de commandes — il faudra alors des vues côté
// Postgres.
//
// Ce que « vendu » veut dire : une commande annulée ne compte nulle part, et
// l'argent n'est compté que sur les commandes LIVRÉES. Une commande confirmée
// n'est pas encore encaissée ; la confondre avec du chiffre d'affaires ferait
// croire à un mois meilleur qu'il n'est. L'argent des confirmées et des
// expédiées est compté à part, sous le nom « en attente ».

export type JourVente = { jour: string; date: string; commandes: number };

/** Une mesure de durée, avec le nombre de commandes sur lesquelles elle porte. */
export type Delai = { jours: number; sur: number };

export type ClienteFidele = {
  nom: string;
  telephone: string;
  commandes: number;
  total: number;
};

export type StatsAdmin = {
  // Note : les quatre compteurs « à faire aujourd'hui » de l'accueil (à
  // rappeler, en retard, à emballer, en route) ne sont PAS ici. Ils se
  // déduisent du statut et de la date de création, tous deux présents dans la
  // lecture légère `getOrders()` que l'accueil fait déjà — les calculer aussi
  // ici donnerait deux sources pour le même chiffre affiché à deux endroits de
  // la même page. Une seule dérivation, dans la page qui l'affiche.

  // ── L'argent ──────────────────────────────────────────────────────
  /** Commandes non annulées, ce mois et le mois dernier. */
  ceMois: number;
  moisDernier: number;
  /** Encaissé (livrées seulement), ce mois et le mois dernier. */
  encaisseMois: number;
  encaisseMoisDernier: number;
  /** Confirmées + expédiées : l'argent qui doit encore rentrer. */
  enAttente: number;
  enAttenteNombre: number;
  /** Annulées : l'argent qui ne rentrera pas. */
  perdu: number;
  /** Sur ce qui a été encaissé, la part des veilleuses et celle des livraisons. */
  partProduits: number;
  partLivraison: number;
  totalDepuisDebut: number;
  meilleureJournee: { date: string; total: number } | null;
  meilleurMois: { mois: string; total: number } | null;
  panierMoyen: number;
  /** Part des commandes annulées, en pourcentage, sur tout l'historique. */
  tauxAnnulation: number;

  // ── Le temps ──────────────────────────────────────────────────────
  /** Les quatorze derniers jours, du plus ancien au plus récent. */
  quatorzeJours: JourVente[];

  // ── Tes clientes ──────────────────────────────────────────────────
  /** Numéros distincts ayant commandé au moins une fois (annulées exclues). */
  clientes: number;
  /** Celles qui ont commandé deux fois ou plus, les plus dépensières d'abord. */
  clientesFideles: ClienteFidele[];
  /** Part du chiffre encaissé qui vient d'une cliente venue plusieurs fois. */
  partFideles: number;

  // ── Qualité ───────────────────────────────────────────────────────
  /** Sur les commandes traitées, combien sont payées au bout. Le chiffre qui
   *  compte en paiement à la livraison. */
  tauxLivraison: number;
  /** Dénominateur du taux : livrées + annulées. */
  traitees: number;
  annulationsParWilaya: Array<{ nom: string; n: number }>;
  wilayasParArgent: Array<{ nom: string; n: number }>;
  domicile: { commandes: number; panierMoyen: number };
  stopdesk: { commandes: number; panierMoyen: number };

  // ── Produits ──────────────────────────────────────────────────────
  /** Les veilleuses les plus commandées (annulées exclues). */
  formes: Array<{ nom: string; quantite: number }>;
  /** Les coloris les plus commandés (annulées exclues). */
  coloris: Array<{ nom: string; quantite: number }>;
  /** Les wilayas qui commandent le plus (annulées exclues). */
  wilayas: Array<{ nom: string; commandes: number }>;
  /** Les articles vendus en tout (annulées exclues) — combien de veilleuses
   *  sont réellement sorties de l'atelier. */
  piecesVendues: number;
  /** Les jours de la semaine, du lundi au dimanche. */
  parJourSemaine: Array<{ jour: string; commandes: number }>;
  /** Noms de veilleuses déjà commandées — pour trouver celles qui ne l'ont
   *  jamais été, en comparant au catalogue (voir la page Statistiques). */
  produitsCommandes: string[];
  /** Coloris déjà commandés, sous la forme « Veilleuse::Coloris » — même
   *  usage : révéler ceux qui n'ont jamais trouvé preneur. */
  colorisCommandes: string[];

  // ── Délais ────────────────────────────────────────────────────────
  // Mesurés sur les commandes qui portent les dates correspondantes, c'est-à-
  // dire celles passées APRÈS la migration 20260930173000. Les commandes
  // antérieures n'ont jamais enregistré ces dates et ne peuvent pas être
  // rattrapées : chaque délai annonce donc sur combien de commandes il porte,
  // et vaut 0/0 tant qu'aucune n'est mesurable.
  delais: {
    /** Commande → confirmation : le temps que TU mets à rappeler. */
    confirmation: Delai;
    /** Confirmation → expédition : la préparation, à l'atelier. */
    expedition: Delai;
    /** Expédition → livraison : le trajet, chez le livreur. */
    livraison: Delai;
    /** Commande → livraison : ce que la cliente a attendu en tout. */
    total: Delai;
  };
};

type LigneCommande = {
  id: number;
  created_at: string;
  status: OrderStatus;
  wilaya: string;
  phone: string;
  customer_first_name: string;
  customer_last_name: string;
  delivery_method: "domicile" | "stopdesk";
  delivery_fee: number;
  products_total: number;
  order_total: number;
  // Optionnelles : ces trois colonnes n'existent qu'après la migration
  // 20260930173000. Voir la note du `select` plus bas.
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  order_items: Array<{
    quantity: number;
    products: { name: string } | null;
    product_colors: { color_name: string } | null;
  }>;
};

const MS_PAR_JOUR = 86_400_000;

/** Le début du mois courant (décalage 0) ou du mois précédent (-1). */
function debutDeMois(decalage: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + decalage, 1);
}

function dans(o: { created_at: string }, depuis: Date, jusqua: Date): boolean {
  const d = new Date(o.created_at);
  return d >= depuis && d < jusqua;
}

function somme<T>(liste: T[], valeur: (x: T) => number): number {
  return liste.reduce((n, x) => n + valeur(x), 0);
}

function classement<T>(
  source: T[],
  cle: (x: T) => string | null,
  poids: (x: T) => number,
  combien: number,
): Array<{ nom: string; n: number }> {
  const compte = new Map<string, number>();
  for (const x of source) {
    const k = cle(x);
    if (!k) continue;
    compte.set(k, (compte.get(k) ?? 0) + poids(x));
  }
  return [...compte.entries()]
    .map(([nom, n]) => ({ nom, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, combien);
}

/**
 * Moyenne d'une liste de durées, en jours.
 *
 * `sur` n'est pas décoratif : les délais ne peuvent être mesurés que sur les
 * commandes qui portent les dates, donc l'écran doit pouvoir dire « 2,4 jours
 * sur 7 commandes » plutôt que de laisser croire à une moyenne sur tout
 * l'historique. Une liste vide renvoie 0 jour sur 0 commande, ce que l'affichage
 * traduit par « pas encore mesuré ».
 */
function moyenneJours(durees: number[]): Delai {
  if (durees.length === 0) return { jours: 0, sur: 0 };
  const total = durees.reduce((n, d) => n + d, 0);
  return { jours: Math.round((total / durees.length) * 10) / 10, sur: durees.length };
}

/** Écart en jours entre deux dates ISO, ou null si l'une des deux manque. */
function ecartJours(depuis?: string | null, jusqua?: string | null): number | null {
  if (!depuis || !jusqua) return null;
  const d = (new Date(jusqua).getTime() - new Date(depuis).getTime()) / MS_PAR_JOUR;
  // Une date de livraison antérieure à la commande est une saisie impossible
  // (ou une horloge qui a reculé) : mieux vaut l'ignorer que de tirer une
  // moyenne vers le bas avec un négatif.
  return d >= 0 ? d : null;
}

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// Le lundi vaut 0 en convention française, alors que getDay() renvoie 0 pour
// dimanche : d'où le +6 modulo 7.
function indexJourSemaine(iso: string): number {
  return (new Date(iso).getDay() + 6) % 7;
}

export async function getAdminStats(): Promise<StatsAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      // `*` plutôt que la liste des colonnes, et c'est délibéré : les trois
      // dates de statut n'existent qu'après la migration 20260930173000. Une
      // liste explicite ferait échouer TOUTE la lecture — donc tout l'admin —
      // tant que le SQL n'a pas été collé, alors qu'avec `*` les colonnes
      // absentes arrivent simplement à `undefined` et les délais s'affichent
      // « pas encore mesuré ». Le site continue de fonctionner dans les deux
      // états, ce qui compte pour une migration qu'un humain doit appliquer.
      //
      // Sans espaces dans les parenthèses imbriquées : PostgREST refuse
      // « order_items ( … ) » dès qu'il y a un deuxième niveau (PGRST100).
      "*,order_items(quantity,products(name),product_colors(color_name))",
    )
    .order("created_at", { ascending: false })
    .returns<LigneCommande[]>();

  // Jamais de repli silencieux dans l'admin : un tableau vide se lirait comme
  // « aucune vente » alors que la lecture a échoué. On renvoie null et la page
  // le dit.
  if (error || !data) return null;

  const vivantes = data.filter((o) => o.status !== "annulée");
  const annulees = data.filter((o) => o.status === "annulée");
  const livrees = data.filter((o) => o.status === "livrée");

  const moisCourant = debutDeMois(0);
  const moisPrecedent = debutDeMois(-1);
  const tresLoin = new Date(8.64e15);

  // ── L'argent ───────────────────────────────────────────────────────
  const enAttenteListe = vivantes.filter(
    (o) => o.status === "confirmée" || o.status === "expédiée",
  );

  const parJour = new Map<string, number>();
  for (const o of livrees) {
    const jour = o.created_at.slice(0, 10);
    parJour.set(jour, (parJour.get(jour) ?? 0) + o.order_total);
  }
  const meilleureJournee = [...parJour.entries()].sort((a, b) => b[1] - a[1])[0];

  const parMois = new Map<string, number>();
  for (const o of livrees) {
    const mois = o.created_at.slice(0, 7);
    parMois.set(mois, (parMois.get(mois) ?? 0) + o.order_total);
  }
  const meilleurMois = [...parMois.entries()].sort((a, b) => b[1] - a[1])[0];

  // ── Le temps ───────────────────────────────────────────────────────
  // Quatorze jours glissants, zéros compris : un trou dans la courbe est une
  // information, pas une case à sauter.
  const quatorzeJours: JourVente[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const lendemain = new Date(d);
    lendemain.setDate(d.getDate() + 1);
    quatorzeJours.push({
      jour: d.toLocaleDateString("fr-FR", { weekday: "narrow" }),
      date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      commandes: vivantes.filter((o) => dans(o, d, lendemain)).length,
    });
  }

  // ── Tes clientes ───────────────────────────────────────────────────
  // Groupées par numéro NORMALISÉ (0555 12 34 56 et +213555123456 sont la même
  // personne) : sans ça, une cliente qui écrit son numéro autrement compte deux
  // fois, et le palmarès des fidèles devient faux sans le dire.
  const parNumero = new Map<string, LigneCommande[]>();
  for (const o of vivantes) {
    const numero = normalizePhone(o.phone);
    if (!numero) continue;
    const liste = parNumero.get(numero);
    if (liste) liste.push(o);
    else parNumero.set(numero, [o]);
  }

  const clientesFideles: ClienteFidele[] = [...parNumero.entries()]
    .filter(([, liste]) => liste.length >= 2)
    .map(([, liste]) => {
      // La commande la plus récente porte le nom le plus à jour.
      const recente = liste[0];
      return {
        nom: `${recente.customer_first_name} ${recente.customer_last_name}`.trim(),
        telephone: recente.phone,
        commandes: liste.length,
        total: somme(
          liste.filter((o) => o.status === "livrée"),
          (o) => o.order_total,
        ),
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const revenuFideles = somme(
    livrees.filter((o) => (parNumero.get(normalizePhone(o.phone))?.length ?? 0) >= 2),
    (o) => o.order_total,
  );
  const revenuLivre = somme(livrees, (o) => o.order_total);

  // ── Qualité ────────────────────────────────────────────────────────
  const traitees = livrees.length + annulees.length;
  const parLivraison = (m: "domicile" | "stopdesk") =>
    livrees.filter((o) => o.delivery_method === m);

  // ── Produits ───────────────────────────────────────────────────────
  const lignes = vivantes.flatMap((o) => o.order_items ?? []);
  const cleColoris = (l: LigneCommande["order_items"][number]) =>
    l.products?.name && l.product_colors?.color_name
      ? `${l.products.name}::${l.product_colors.color_name}`
      : null;

  const parJourSemaine = JOURS_SEMAINE.map((jour, i) => ({
    jour,
    commandes: vivantes.filter((o) => indexJourSemaine(o.created_at) === i).length,
  }));

  // ── Délais ─────────────────────────────────────────────────────────
  const ecarts = (depuis: (o: LigneCommande) => string | null | undefined, jusqua: (o: LigneCommande) => string | null | undefined) =>
    vivantes
      .map((o) => ecartJours(depuis(o), jusqua(o)))
      .filter((d): d is number => d !== null);

  return {
    ceMois: vivantes.filter((o) => dans(o, moisCourant, tresLoin)).length,
    moisDernier: vivantes.filter((o) => dans(o, moisPrecedent, moisCourant)).length,
    encaisseMois: somme(livrees.filter((o) => dans(o, moisCourant, tresLoin)), (o) => o.order_total),
    encaisseMoisDernier: somme(
      livrees.filter((o) => dans(o, moisPrecedent, moisCourant)),
      (o) => o.order_total,
    ),
    enAttente: somme(enAttenteListe, (o) => o.order_total),
    enAttenteNombre: enAttenteListe.length,
    perdu: somme(annulees, (o) => o.order_total),
    partProduits: somme(livrees, (o) => o.products_total),
    partLivraison: somme(livrees, (o) => o.delivery_fee),
    totalDepuisDebut: revenuLivre,
    meilleureJournee: meilleureJournee ? { date: meilleureJournee[0], total: meilleureJournee[1] } : null,
    meilleurMois: meilleurMois ? { mois: meilleurMois[0], total: meilleurMois[1] } : null,
    panierMoyen: livrees.length ? Math.round(revenuLivre / livrees.length) : 0,
    tauxAnnulation: data.length ? Math.round((annulees.length / data.length) * 100) : 0,

    quatorzeJours,

    clientes: parNumero.size,
    clientesFideles,
    partFideles: revenuLivre ? Math.round((revenuFideles / revenuLivre) * 100) : 0,

    tauxLivraison: traitees ? Math.round((livrees.length / traitees) * 100) : 0,
    traitees,
    annulationsParWilaya: classement(annulees, (o) => o.wilaya, () => 1, 5),
    wilayasParArgent: classement(livrees, (o) => o.wilaya, (o) => o.order_total, 5),
    domicile: {
      commandes: parLivraison("domicile").length,
      panierMoyen: parLivraison("domicile").length
        ? Math.round(somme(parLivraison("domicile"), (o) => o.order_total) / parLivraison("domicile").length)
        : 0,
    },
    stopdesk: {
      commandes: parLivraison("stopdesk").length,
      panierMoyen: parLivraison("stopdesk").length
        ? Math.round(somme(parLivraison("stopdesk"), (o) => o.order_total) / parLivraison("stopdesk").length)
        : 0,
    },

    formes: classement(lignes, (l) => l.products?.name ?? null, (l) => l.quantity, 5).map((x) => ({
      nom: x.nom,
      quantite: x.n,
    })),
    coloris: classement(lignes, (l) => l.product_colors?.color_name ?? null, (l) => l.quantity, 5).map(
      (x) => ({ nom: x.nom, quantite: x.n }),
    ),
    wilayas: classement(vivantes, (o) => o.wilaya, () => 1, 5).map((x) => ({
      nom: x.nom,
      commandes: x.n,
    })),
    piecesVendues: somme(lignes, (l) => l.quantity),
    parJourSemaine,
    produitsCommandes: [...new Set(lignes.map((l) => l.products?.name).filter(Boolean) as string[])],
    colorisCommandes: [...new Set(lignes.map(cleColoris).filter(Boolean) as string[])],

    delais: {
      confirmation: moyenneJours(ecarts((o) => o.created_at, (o) => o.confirmed_at)),
      expedition: moyenneJours(ecarts((o) => o.confirmed_at, (o) => o.shipped_at)),
      livraison: moyenneJours(ecarts((o) => o.shipped_at, (o) => o.delivered_at)),
      total: moyenneJours(ecarts((o) => o.created_at, (o) => o.delivered_at)),
    },
  };
}
