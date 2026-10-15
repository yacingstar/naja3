import { cache } from "react";
// Le client SANS cookies, exprès — voir la note en tête de supabase/public.ts.
// L'annonce d'un atelier est la même pour tout le monde : lire des cookies ici
// rendrait /atelier dynamique, `revalidate` deviendrait lettre morte, et chaque
// visiteur coûterait une invocation serverless et une requête Supabase.
import { createPublicClient } from "@/lib/supabase/public";

/** Un atelier, tel que la page publique en a besoin. */
export type Workshop = {
  id: number;
  title: string;
  description: string;
  // ISO, tel que Postgres le renvoie. Le formatage d'affichage vit dans
  // src/lib/format.ts (fuseau épinglé sur Alger) et pas ici.
  startsAt: string;
  endsAt: string | null;
  location: string;
  // Entier en DA. Zéro veut dire gratuit — la page écrit « Gratuit ».
  price: number;
  // L'acompte à verser pour valider une inscription, en DA. Zéro veut dire
  // qu'il n'y en a pas — et c'est la valeur par défaut, donc un atelier dont
  // personne n'a rien saisi reste exact.
  //
  // Ce n'est pas un détail d'affichage : c'est ce qui empêche le bouton
  // « Réserver ma place » de promettre une place qui n'est pas encore tenue.
  deposit: number;
  // Nombre de places AFFICHÉ. null = aucune limite annoncée. Ne bloque rien :
  // voir la note de la migration.
  seats: number | null;
};

/** Ce que la page a besoin de savoir, et rien de plus. */
export type WorkshopApercu = {
  workshop: Workshop;
  // Les inscriptions sont-elles encore ouvertes ? Décidé par la date seule :
  // c'est le choix de la patronne, il n'y a pas de bouton d'ouverture.
  ouvert: boolean;
};

type WorkshopRow = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  price: number;
  deposit: number;
  seats: number | null;
};

const COLONNES =
  "id, title, description, starts_at, ends_at, location, price, deposit, seats";

function versWorkshop(row: WorkshopRow): Workshop {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    price: row.price,
    // `?? 0` par prudence : si la migration de l'acompte n'a pas encore été
    // appliquée, la colonne est absente et PostgREST renvoie `undefined` — la
    // page doit continuer à s'afficher sans acompte plutôt que d'écrire
    // « NaN DA ».
    deposit: row.deposit ?? 0,
    seats: row.seats,
  };
}

/**
 * L'atelier à montrer : le prochain à venir, ou à défaut le dernier qui a eu
 * lieu.
 *
 * Deux requêtes et pas une, parce que ce sont deux questions différentes :
 * « qu'est-ce qui vient ? » puis, seulement si la réponse est vide, « qu'est-ce
 * qui vient de passer ? ». Une seule requête qui prendrait le plus proche dans
 * les deux sens afficherait un atelier passé alors qu'un atelier à venir existe
 * — c'est-à-dire, très exactement, jamais le bon.
 *
 * Le repli sur le dernier atelier passé n'est pas un détail : sans lui, la page
 * retomberait sur « aucun atelier annoncé » le lendemain de l'atelier, alors
 * qu'elle a justement les informations à montrer (lieu, prix) avec un
 * formulaire fermé. « Les inscriptions sont closes » est une réponse ; une page
 * vide n'en est pas une.
 *
 * `cache` de React dé-duplique à l'intérieur d'un même rendu, comme products.ts
 * et deliveryRates.ts.
 */
export const getApercuAtelier = cache(async function getApercuAtelier(): Promise<WorkshopApercu | null> {
  const supabase = createPublicClient();
  // Lue dans ce module et pas dans la page : lire l'horloge pendant le rendu
  // d'un composant est refusé par la règle de pureté de React
  // (`react-hooks/purity`) — même constat que commandesEnRetard dans orders.ts.
  const maintenant = new Date().toISOString();

  const { data: aVenir, error } = await supabase
    .from("workshops")
    .select(COLONNES)
    .gt("starts_at", maintenant)
    .order("starts_at", { ascending: true })
    .limit(1)
    .returns<WorkshopRow[]>();

  // Une erreur ici est le plus souvent « la migration n'a pas encore été
  // appliquée » (table absente) ou un problème réseau. Dans les deux cas la
  // page doit s'afficher : elle montre l'état « rien d'annoncé », pas une
  // erreur.
  if (error) return null;

  if (aVenir && aVenir.length > 0) {
    return { workshop: versWorkshop(aVenir[0]), ouvert: true };
  }

  const { data: passe, error: erreurPasse } = await supabase
    .from("workshops")
    .select(COLONNES)
    .lte("starts_at", maintenant)
    .order("starts_at", { ascending: false })
    .limit(1)
    .returns<WorkshopRow[]>();

  if (erreurPasse || !passe || passe.length === 0) return null;

  return { workshop: versWorkshop(passe[0]), ouvert: false };
});
