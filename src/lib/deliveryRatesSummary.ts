// Le calcul des deux chiffres de livraison affichés sur les pages produit,
// séparé de la LECTURE des tarifs (deliveryRates.ts).
//
// Pourquoi séparé, et pas simplement dans deliveryRates.ts : `DirectOrderForm`
// est un composant client, et `deliveryRates.ts` tire le client Supabase
// serveur. Un import de VALEUR depuis un module client vers ce fichier-là fait
// échouer la compilation de toute la page avec « You're importing a module that
// depends on server-only ». Un import de TYPE, lui, est effacé à la
// compilation et ne pose aucun problème — d'où la frontière exacte tracée ici.
//
// C'est la même raison qui a fait sortir orderStatus.ts de orders.ts.
import type { DeliveryRate } from "@/lib/deliveryRates";

export type ResumeTarifs = {
  /**
   * Le tarif le plus bas de la grille, toutes wilayas et tous modes confondus.
   * `null` tant qu'aucun tarif n'est renseigné — et pas 0, qui s'afficherait
   * « livraison à partir de 0 DA » alors que ça veut dire « pas encore rempli ».
   */
  minimum: number | null;
  /** Le tarif à domicile d'Alger, ou null s'il n'est pas renseigné. */
  alger: number | null;
};

/**
 * Les deux chiffres d'accroche des pages produit : « à partir de X », et le
 * tarif d'Alger en exemple.
 *
 * Calculés depuis la grille, jamais écrits en dur : les tarifs se modifient
 * depuis l'admin de livraison, et une constante dans le code afficherait un
 * jour un prix qui n'existe plus — sur la page qui sert justement à rassurer
 * avant l'achat.
 *
 * Les tarifs à 0 sont ignorés : dans cette grille, 0 veut dire « pas encore
 * renseigné » (le seed initial est à 0 partout), pas « livraison gratuite ».
 */
export function resumeTarifs(rates: DeliveryRate[]): ResumeTarifs {
  const prix = rates
    .flatMap((r) => [r.domicilePrice, r.stopdeskPrice])
    .filter((p): p is number => typeof p === "number" && p > 0);
  const domicileAlger = rates.find((r) => /alger/i.test(r.wilaya))?.domicilePrice;

  return {
    minimum: prix.length > 0 ? Math.min(...prix) : null,
    alger: domicileAlger && domicileAlger > 0 ? domicileAlger : null,
  };
}
