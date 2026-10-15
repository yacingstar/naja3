// Le statut d'un inscrit à un atelier.
//
// Sorti de workshops.ts / adminWorkshops.ts pour la même raison exacte que
// orderStatus.ts l'a été de orders.ts : ces deux fichiers-là tirent un client
// Supabase serveur, donc un composant CLIENT ne peut en importer que des types.
// Le sélecteur de statut est un Client Component, et il a besoin des valeurs,
// pas seulement du type — d'où ce fichier séparé, sans aucun import.
//
// L'ordre suit le parcours d'un inscrit : il s'inscrit, on le rappelle pour
// confirmer, il vient — ou il annule. Même progression que ORDER_STATUSES.
export type RegistrationStatus = "inscrit" | "confirmé" | "venu" | "annulé";

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "inscrit",
  "confirmé",
  "venu",
  "annulé",
];

// Un statut « annulé » ne compte pas dans le nombre d'inscrits. C'est la seule
// règle métier de ce fichier, et elle vit ici pour être partagée : l'admin la
// lit pour ses compteurs, et personne ne doit la réécrire ailleurs.
export function compteCommeInscrit(status: RegistrationStatus): boolean {
  return status !== "annulé";
}
