const priceFormatter = new Intl.NumberFormat("fr-FR");

// Amounts are integer DZD, no cents — format everywhere through this
// instead of reimplementing Intl.NumberFormat calls.
export function formatPrice(amount: number): string {
  return `${priceFormatter.format(amount)} DA`;
}

// Postgres hands back `created_at` as UTC, but the only person reading it is
// the admin, in Algeria. Both the locale and the time zone are pinned rather
// than left to the host: Netlify's functions run in UTC, so an order placed at
// 00:30 Algiers time would otherwise be dated to the previous day. Pinning has
// a second payoff — server and client renders produce the same string, so
// React never sees a hydration mismatch (OrderRow is a Client Component).
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Africa/Algiers",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Algiers",
});

// "12 février 2026 à 14:30" — detail screens, where there's room to breathe.
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

// "12 févr. 2026, 14:30" — the orders table, where there isn't.
export function formatDateTimeShort(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}

// Les ateliers ont besoin du jour de la semaine, parce qu'un atelier se
// choisit d'abord comme ça : « samedi 25 octobre » se retient, « 25 octobre »
// oblige à compter. Et d'une heure séparée, parce que « de 14:00 à 17:00 » se
// lit mieux que deux dates complètes mises bout à bout.
//
// Deux formateurs plutôt qu'un troisième qui porterait tout : formatDateAtelier
// se compose des deux, donc l'écriture d'une date d'atelier n'existe qu'à un
// seul endroit (voir plus bas).
//
// Mêmes épingles que ci-dessus, et pour les mêmes raisons : locale et fuseau.
// Ceux-ci ne servent que côté serveur (la page /atelier et le message Telegram),
// donc pas de risque d'écart d'hydratation — mais l'épingler reste ce qui
// garantit que la date affichée est celle d'Alger et pas celle de la fonction
// Netlify, qui tourne en UTC.
const jourFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Algiers",
});

const heureFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Algiers",
});

// "Samedi 25 octobre 2026" — la majuscule est posée ici, pas par une classe
// CSS `capitalize` chez les appelants. Une classe `capitalize` met une
// majuscule à CHAQUE mot : « Samedi 25 Octobre 2026 À 14:00 ». Comme le jour
// est presque toujours en tête de ligne ou de phrase, il commence par une
// majuscule et c'est cette fonction qui en décide.
export function formatDateJour(iso: string): string {
  const texte = jourFormatter.format(new Date(iso));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// "14:00"
export function formatHeure(iso: string): string {
  return heureFormatter.format(new Date(iso));
}

// "samedi 25 octobre 2026 à 14:00" — pour les endroits qui n'ont la place que
// d'une ligne : la confirmation d'inscription, et le message Telegram.
export function formatDateAtelier(iso: string): string {
  return `${formatDateJour(iso)} à ${formatHeure(iso)}`;
}

// ── L'aller-retour avec <input type="datetime-local"> ────────────────────────
//
// Ce fichier sait comment une date devient du texte ; il sait aussi comment
// elle redevient un instant, parce que séparer les deux moitiés d'un
// aller-retour est exactement ce qui produit un décalage d'une heure qu'on ne
// retrouve plus. Les deux vivent donc ici, à côté de l'épinglage
// Africa/Algiers qu'elles partagent.
//
// Le problème concret : <input type="datetime-local"> manipule une heure
// MURALE sans fuseau (« 2026-10-25T14:00 »). Si on laissait le navigateur ou le
// serveur l'interpréter, le résultat dépendrait de l'endroit où le code
// tourne — les fonctions Netlify sont en UTC, donc 14:00 deviendrait 13:00 à
// Alger. Les deux fonctions ci-dessous refusent ce flottement : l'heure tapée
// est toujours celle d'Alger, quel que soit le fuseau de la machine.

// L'Algérie est à UTC+1 en permanence — pas d'heure d'été depuis 1981, et rien
// n'est prévu. C'est une constante ici plutôt qu'une donnée calculée : Node
// peut résoudre un fuseau IANA, mais pas garantir qu'il le fera de la même
// façon dans dix ans, alors que ce décalage-là est une propriété du pays.
//
// Si l'Algérie rétablissait l'heure d'été, il n'y aurait qu'une ligne à
// changer — et le fait qu'elle soit seule à porter cette information est
// précisément le but.
const DECALAGE_ALGER = "+01:00";

const machineLocaleFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // `hourCycle: "h23"` et pas `hour12: false` : selon la version d'ICU,
  // `hour12: false` peut rendre minuit « 24:00 » au lieu de « 00:00 », ce qui
  // produirait une valeur que <input type="datetime-local"> refuse en silence.
  hourCycle: "h23",
  timeZone: "Africa/Algiers",
});

/**
 * Un instant stocké → la valeur d'un `<input type="datetime-local">` :
 * « 2026-10-25T14:00 », en heure d'Alger.
 *
 * Rendue côté serveur et passée en propriété au formulaire, jamais calculée
 * dans le navigateur : deux calculs (serveur en UTC, navigateur à Alger)
 * donneraient deux valeurs initiales différentes pour le même atelier, et
 * React signalerait un écart d'hydratation.
 */
export function versDatetimeLocal(iso: string): string {
  const parties: Record<string, string> = {};
  for (const { type, value } of machineLocaleFormatter.formatToParts(new Date(iso))) {
    parties[type] = value;
  }
  return `${parties.year}-${parties.month}-${parties.day}T${parties.hour}:${parties.minute}`;
}

/**
 * L'inverse : « 2026-10-25T14:00 » → l'instant ISO à stocker.
 *
 * `null` sur une saisie illisible, pour que l'appelant décide quoi en dire —
 * cette fonction n'a aucun message à afficher et n'en invente pas.
 */
export function versInstantAlger(machine: string): string | null {
  const valeur = machine.trim();
  if (!valeur) return null;

  // Deux formes possibles : avec secondes ou sans. Rien d'autre n'est accepté —
  // une chaîne inattendue doit ressortir en `null`, pas être devinée.
  const sansSecondes = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valeur);
  const avecSecondes = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(valeur);
  if (!sansSecondes && !avecSecondes) return null;

  const complet = sansSecondes ? `${valeur}:00` : valeur;
  const date = new Date(`${complet}${DECALAGE_ALGER}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
