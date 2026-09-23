import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/orderStatus";

// Les chiffres de l'accueil de gestion.
//
// Une seule lecture des commandes avec leurs lignes, puis tout est calculé en
// mémoire. À quelques centaines de commandes c'est plus rapide qu'une requête
// d'agrégat par chiffre, et surtout c'est lisible : la règle de chaque calcul
// est écrite ici, pas répartie dans du SQL. À revoir le jour où la boutique
// passe le millier de commandes — il faudra alors des vues côté Postgres.
//
// Ce que « vendu » veut dire : une commande annulée ne compte nulle part, et
// l'argent n'est compté que sur les commandes LIVRÉES. Une commande confirmée
// n'est pas encore encaissée ; la confondre avec du chiffre d'affaires ferait
// croire à un mois meilleur qu'il n'est.

export type JourVente = { jour: string; date: string; commandes: number };

export type StatsAdmin = {
  /** Commandes non annulées, ce mois et le mois dernier. */
  ceMois: number;
  moisDernier: number;
  /** Encaissé (livrées seulement), ce mois et le mois dernier. */
  encaisseMois: number;
  encaisseMoisDernier: number;
  /** Panier moyen des commandes livrées, tous mois confondus. */
  panierMoyen: number;
  /** Part des commandes annulées, en pourcentage, sur tout l'historique. */
  tauxAnnulation: number;
  /** Les quatorze derniers jours, du plus ancien au plus récent. */
  quatorzeJours: JourVente[];
  /** Les veilleuses les plus commandées (annulées exclues). */
  formes: Array<{ nom: string; quantite: number }>;
  /** Les coloris les plus commandés (annulées exclues). */
  coloris: Array<{ nom: string; quantite: number }>;
  /** Les wilayas qui commandent le plus (annulées exclues). */
  wilayas: Array<{ nom: string; commandes: number }>;
  /** Les articles vendus en tout (annulées exclues) — combien de veilleuses
   *  sont réellement sorties de l atelier. */
  piecesVendues: number;
};

type LigneCommande = {
  id: number;
  created_at: string;
  status: OrderStatus;
  wilaya: string;
  order_total: number;
  order_items: Array<{
    quantity: number;
    products: { name: string } | null;
    product_colors: { color_name: string } | null;
  }>;
};

function debutDeMois(decalage: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + decalage, 1);
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

export async function getAdminStats(): Promise<StatsAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      // Sans espaces dans les parenthèses imbriquées : PostgREST refuse
      // « order_items ( … ) » dès qu il y a un deuxième niveau (PGRST100).
      "id,created_at,status,wilaya,order_total,order_items(quantity,products(name),product_colors(color_name))",
    )
    .order("created_at", { ascending: false })
    .returns<LigneCommande[]>();

  // Jamais de repli silencieux dans l'admin : un tableau vide se lirait comme
  // « aucune vente » alors que la lecture a échoué. On renvoie null et la page
  // le dit.
  if (error || !data) return null;

  const vivantes = data.filter((o) => o.status !== "annulée");
  const livrees = data.filter((o) => o.status === "livrée");

  const moisCourant = debutDeMois(0);
  const moisPrecedent = debutDeMois(-1);
  const dans = (o: LigneCommande, depuis: Date, jusqua: Date) => {
    const d = new Date(o.created_at);
    return d >= depuis && d < jusqua;
  };

  const encaisse = (liste: LigneCommande[]) => liste.reduce((n, o) => n + o.order_total, 0);

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

  const lignes = vivantes.flatMap((o) => o.order_items ?? []);

  // Le délai de fabrication aurait sa place ici, mais la table `orders` ne
  // garde aucune date de changement de statut : on ne sait pas QUAND une
  // commande est passée à « livrée », seulement qu elle l est. Il faudrait une
  // colonne `delivered_at` écrite par updateOrderStatus. Pas de chiffre inventé
  // en attendant.

  return {
    ceMois: vivantes.filter((o) => dans(o, moisCourant, new Date(8.64e15))).length,
    moisDernier: vivantes.filter((o) => dans(o, moisPrecedent, moisCourant)).length,
    encaisseMois: encaisse(livrees.filter((o) => dans(o, moisCourant, new Date(8.64e15)))),
    encaisseMoisDernier: encaisse(livrees.filter((o) => dans(o, moisPrecedent, moisCourant))),
    panierMoyen: livrees.length ? Math.round(encaisse(livrees) / livrees.length) : 0,
    tauxAnnulation: data.length
      ? Math.round((data.filter((o) => o.status === "annulée").length / data.length) * 100)
      : 0,
    quatorzeJours,
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
    piecesVendues: lignes.reduce((n, l) => n + l.quantity, 0),
  };
}
