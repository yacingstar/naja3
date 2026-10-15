import "server-only";
import { createClient } from "@/lib/supabase/server";
import { compteCommeInscrit, type RegistrationStatus } from "@/lib/registrationStatus";

// Lectures réservées à l'admin, sur le client de session (src/lib/supabase/server.ts)
// — donc dynamiques et soumises à la RLS, comme adminProducts.ts et adminStats.ts.
// L'inverse exact de src/lib/workshops.ts, qui lit la même table par le client
// public et sans cookies.
//
// Comme les autres lectures admin : aucun repli en cas d'erreur. Afficher une
// liste vide quand la lecture a échoué laisserait croire qu'il n'y a pas
// d'inscrits, ce qui est précisément l'information qu'on vient chercher.

export type AdminRegistration = {
  id: number;
  createdAt: string;
  status: RegistrationStatus;
  firstName: string;
  lastName: string;
  phone: string;
};

export type AdminWorkshopListItem = {
  id: number;
  title: string;
  startsAt: string;
  location: string;
  price: number;
  // L'acompte demandé pour valider une place, en DA. Zéro = aucun.
  deposit: number;
  seats: number | null;
  // Les inscrits qui comptent : les annulés ne sont pas dedans. C'est la règle
  // de compteCommeInscrit (src/lib/registrationStatus.ts), appliquée ici pour
  // que l'admin et la page ne puissent pas diverger.
  inscrits: number;
  // Les annulés, comptés à part — pas pour le nombre de places, mais parce
  // qu'une vague d'annulations est une information en soi.
  annules: number;
  // Calculé ici et pas dans le composant : lire l'horloge pendant le rendu est
  // refusé par la règle de pureté de React (`react-hooks/purity`).
  aVenir: boolean;
};

export type AdminWorkshopDetail = AdminWorkshopListItem & {
  description: string;
  endsAt: string | null;
  createdAt: string;
  registrations: AdminRegistration[];
};

type RegistrationRow = {
  id: number;
  created_at: string;
  status: RegistrationStatus;
  first_name: string;
  last_name: string;
  phone: string;
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
  created_at: string;
  workshop_registrations: RegistrationRow[] | null;
};

const CHAMPS =
  "id, title, description, starts_at, ends_at, location, price, deposit, seats, created_at, " +
  // Sans espaces dans les parenthèses imbriquées : PostgREST refuse dès qu'il y
  // a un deuxième niveau (PGRST100) — même remarque que getOrders.
  "workshop_registrations(status)";

function versInscription(row: RegistrationRow): AdminRegistration {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
  };
}

function versListeItem(row: WorkshopRow, maintenant: number): AdminWorkshopListItem {
  const inscriptions = row.workshop_registrations ?? [];
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    location: row.location,
    price: row.price,
    // `?? 0` : si la migration de l'acompte n'est pas encore passée, la colonne
    // est absente et l'admin doit continuer à s'afficher sans acompte.
    deposit: row.deposit ?? 0,
    seats: row.seats,
    inscrits: inscriptions.filter((i) => compteCommeInscrit(i.status)).length,
    annules: inscriptions.filter((i) => !compteCommeInscrit(i.status)).length,
    aVenir: new Date(row.starts_at).getTime() > maintenant,
  };
}

/**
 * Tous les ateliers, le prochain en premier puis les suivants, et les passés
 * à la fin.
 *
 * Le tri est fait ici plutôt qu'en SQL : PostgREST ne sait pas ordonner « à
 * venir, puis passé, chacun par date croissante ou décroissante » en une
 * clause. Trier un tableau de la taille d'une poignée d'ateliers coûte
 * exactement rien, et la règle reste lisible.
 */
export async function getAdminWorkshops(): Promise<AdminWorkshopListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .select(CHAMPS)
    .order("starts_at", { ascending: false })
    .returns<WorkshopRow[]>();

  if (error || !data) return [];

  const maintenant = Date.now();
  const items = data.map((row) => versListeItem(row, maintenant));

  return items.sort((a, b) => {
    // À venir d'abord.
    if (a.aVenir !== b.aVenir) return a.aVenir ? -1 : 1;
    const da = new Date(a.startsAt).getTime();
    const db = new Date(b.startsAt).getTime();
    // Prochain atelier en tête ; atelier le plus récent en tête chez les passés.
    return a.aVenir ? da - db : db - da;
  });
}

/**
 * Un atelier et ses inscrits, en une requête.
 *
 * Les inscrits remontent triés du plus récent au plus ancien : c'est l'ordre
 * dans lequel la patronne les traite quand elle passe ses appels de
 * confirmation, et c'est aussi celui qui montre d'un coup d'œil les nouvelles
 * inscriptions depuis sa dernière visite.
 */
export async function getAdminWorkshop(id: number): Promise<AdminWorkshopDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .select(CHAMPS)
    .eq("id", id)
    .maybeSingle<WorkshopRow>();

  if (error || !data) return null;

  const base = versListeItem(data, Date.now());
  const registrations = (data.workshop_registrations ?? [])
    .map(versInscription)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    ...base,
    description: data.description,
    endsAt: data.ends_at,
    createdAt: data.created_at,
    registrations,
  };
}
