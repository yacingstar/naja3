// Algerian phone numbers, normalised to international digits-only form:
// country code + subscriber number, no leading zero and no punctuation.
//
//   0555 12 34 56  ->  213555123456
//
// Lives here rather than beside either caller because two of them need the
// exact same transform for different reasons, and a second copy would be free
// to drift: `lib/meta/capi.ts` hashes the result for Meta's advanced matching
// (a wrong normalisation there produces a 0% match rate, never an error), and
// `lib/notify/telegram.ts` builds a wa.me link from it (a wrong one produces a
// dead link). Neither failure announces itself, so there is exactly one copy.
//
// The order form already enforces /^0[0-9]{8,9}$/, so the 00-prefix and
// already-has-213 branches are defensive — a phone typed as +213... or
// 00213... would otherwise become 21300213... and match nobody.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return "";
  if (digits.startsWith("213")) return digits;
  return `213${digits.replace(/^0+/, "")}`;
}

/**
 * Analyse un numéro algérien tel qu'une cliente le tape, et dit s'il est
 * utilisable.
 *
 * Accepte les formes qu'on rencontre vraiment : `0555 12 34 56`,
 * `+213 555 12 34 56`, `00213…`, `213…`, avec ou sans espaces, points, tirets
 * ou parenthèses.
 *
 * Le préfixe mobile doit être **5, 6 ou 7**. Les fixes (`021…`) sont refusés
 * volontairement : ce numéro sert à rappeler la cliente pour confirmer, et à
 * lui envoyer le lien WhatsApp — un fixe ne reçoit ni l'un ni l'autre.
 *
 * Une seule règle, ici, utilisée des deux côtés : le formulaire s'en sert pour
 * afficher une erreur sous le champ, le serveur pour refuser une commande. Deux
 * copies divergeraient, et c'est exactement l'écart qui laisse passer un numéro
 * invalide — ou, pire, refuse un numéro correct.
 */
export function analyserTelephone(
  saisi: string,
): { ok: true; normalise: string } | { ok: false; erreur: string } {
  const chiffres = saisi.replace(/[\s.\-()]/g, "");

  if (!chiffres) {
    return { ok: false, erreur: "Merci d'indiquer votre numéro de téléphone." };
  }
  if (!/^(?:\+213|00213|213|0)[567]\d{8}$/.test(chiffres)) {
    return {
      ok: false,
      erreur:
        "Numéro invalide. Entrez 10 chiffres commençant par 05, 06 ou 07 — par exemple 0555 12 34 56.",
    };
  }
  return { ok: true, normalise: normalizePhone(chiffres) };
}

/**
 * Le nom complet saisi en un seul champ, redécoupé pour la base — qui garde
 * deux colonnes (`customer_first_name` / `customer_last_name`) et les gardera :
 * le schéma ne change pas, et les commandes déjà enregistrées non plus.
 *
 * Premier mot = prénom, le reste = nom. Un nom d'un seul mot donne un nom de
 * famille vide, et c'est acceptable : la colonne est `not null`, pas
 * « non vide », et refuser une cliente qui n'écrit qu'un mot serait une drôle
 * de raison de perdre une vente.
 */
export function decouperNom(complet: string): {
  firstName: string;
  lastName: string;
} {
  const mots = complet.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return { firstName: "", lastName: "" };
  return { firstName: mots[0], lastName: mots.slice(1).join(" ") };
}
