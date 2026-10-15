"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/adminAuth";
import type { ActionResult } from "@/lib/actionResult";
import { versInstantAlger } from "@/lib/format";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/registrationStatus";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkshopInput = {
  title: string;
  description: string;
  // « 2026-10-25T14:00 », tel que <input type="datetime-local"> le renvoie :
  // une heure murale, sans fuseau. La conversion en instant vit dans
  // versInstantAlger — voir la note là-bas.
  startsAt: string;
  // Même format, ou chaîne vide quand la patronne n'annonce pas d'heure de fin.
  endsAt: string;
  location: string;
  price: number;
  // L'acompte à verser d'avance pour valider une place, en DA. Zéro = aucun.
  deposit: number;
  seats: number | null;
};

/**
 * Valide et normalise ce que le formulaire envoie. Retourne soit les colonnes
 * prêtes à écrire, soit un message.
 *
 * Ce qui est refusé ici l'est pour une raison précise, pas par principe :
 *
 *   * un titre vide donne une page dont le titre est une ligne blanche ;
 *   * une date illisible ou absente donne un atelier qui n'apparaît nulle part
 *     (la page publique ne montre que des ateliers datés) — donc un atelier
 *     invisible dont on ne comprend pas pourquoi il ne s'affiche pas ;
 *   * une fin avant le début afficherait « de 17:00 à 14:00 ».
 *
 * Le prix et les places, eux, sont normalisés plutôt que refusés : une
 * virgule, un espace, un champ vide sont des saisies normales, pas des fautes.
 */
function preparer(input: WorkshopInput):
  | { ok: true; valeurs: Record<string, unknown> }
  | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Le titre est obligatoire." };

  const startsAt = versInstantAlger(input.startsAt);
  if (!startsAt) {
    return { ok: false, error: "La date et l'heure de début sont obligatoires." };
  }

  const endsAtBrut = input.endsAt.trim();
  let endsAt: string | null = null;
  if (endsAtBrut) {
    endsAt = versInstantAlger(endsAtBrut);
    if (!endsAt) return { ok: false, error: "L'heure de fin est illisible." };
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { ok: false, error: "La fin doit venir après le début." };
    }
  }

  // Un prix illisible devient 0, c'est-à-dire gratuit, plutôt qu'un refus : le
  // champ est facultatif, et « je n'ai rien mis » est la façon normale de dire
  // gratuit. Le nombre, lui, est arrondi — une virgule saisie dans un champ
  // numérique est une saisie normale, pas une faute.
  const price = Number.isFinite(input.price) ? Math.max(0, Math.round(input.price)) : 0;

  // Même traitement que le prix, et pour la même raison : un acompte illisible
  // vaut « pas d'acompte » plutôt qu'un refus, parce que le champ est
  // facultatif et que le vider est la façon normale de dire « il n'y en a pas ».
  const deposit = Number.isFinite(input.deposit) ? Math.max(0, Math.round(input.deposit)) : 0;

  // `null` et pas `0` : zéro place annoncée et « je n'annonce rien » ne veulent
  // pas dire la même chose, et la colonne les distingue (voir la migration).
  //
  // `Number.isFinite` d'abord : un champ vidé au clavier peut arriver en `NaN`,
  // et `NaN <= 0` est faux — sans ce test, `NaN` passerait le contrôle et
  // partirait vers PostgREST, qui le sérialiserait en `null` (JSON n'a pas de
  // NaN). Ça tomberait par chance sur la bonne valeur, en contournant le
  // message d'erreur prévu pour la mauvaise. Autant refuser franchement.
  let seats: number | null = null;
  if (input.seats != null) {
    if (!Number.isFinite(input.seats)) {
      return { ok: false, error: "Le nombre de places est illisible." };
    }
    const n = Math.round(input.seats);
    if (n <= 0) return { ok: false, error: "Le nombre de places doit être supérieur à zéro." };
    seats = n;
  }

  return {
    ok: true,
    valeurs: {
      title,
      description: input.description.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      location: input.location.trim(),
      price,
      deposit,
      seats,
    },
  };
}

export async function createWorkshop(
  input: WorkshopInput,
): Promise<ActionResult<{ id: number }>> {
  await requireAdminUser();

  const prepare = preparer(input);
  if (!prepare.ok) return prepare;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workshops")
    .insert(prepare.valeurs)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Impossible de créer l'atelier — vérifiez que la migration a été appliquée." };
  }

  revalidatePath("/admin/ateliers");
  // La page publique est mise en cache : sans ça, l'atelier tout juste créé
  // n'apparaîtrait qu'à la prochaine revalidation, et la patronne — qui vient
  // de le créer et ouvre /atelier pour vérifier — croirait que ça n'a pas
  // marché.
  revalidatePath("/atelier");
  return { ok: true, data: { id: data.id } };
}

export async function updateWorkshop(
  workshopId: number,
  input: WorkshopInput,
): Promise<ActionResult> {
  await requireAdminUser();

  if (!Number.isSafeInteger(workshopId) || workshopId <= 0) {
    return { ok: false, error: "Atelier invalide." };
  }

  const prepare = preparer(input);
  if (!prepare.ok) return prepare;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workshops")
    .update(prepare.valeurs)
    .eq("id", workshopId);

  if (error) return { ok: false, error: "Impossible d'enregistrer les modifications." };

  revalidatePath("/admin/ateliers");
  revalidatePath(`/admin/ateliers/${workshopId}`);
  revalidatePath("/atelier");
  return { ok: true };
}

/**
 * Supprime un atelier **et ses inscriptions**.
 *
 * Sans filet, comme deleteOrder, et pour la même raison : c'est là pour les
 * vraies erreurs (un atelier créé deux fois, une date d'essai), pas pour
 * retirer un atelier qui a eu lieu. Un atelier passé reste utile — il porte la
 * liste des gens qui sont venus.
 *
 * La cascade est celle du schéma (`on delete cascade` sur workshop_id), donc
 * rien à effacer à la main ici, contrairement à deleteOrder et ses lignes en
 * RESTRICT.
 */
export async function deleteWorkshop(workshopId: number): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();
  const { error } = await supabase.from("workshops").delete().eq("id", workshopId);
  if (error) return { ok: false, error: "Impossible de supprimer cet atelier." };

  revalidatePath("/admin/ateliers");
  revalidatePath("/atelier");
  return { ok: true };
}

export async function updateRegistrationStatus(
  registrationId: number,
  status: RegistrationStatus,
): Promise<ActionResult> {
  await requireAdminUser();

  if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
    return { ok: false, error: "Inscription invalide." };
  }
  // La liste est fermée : cette action est un point d'entrée HTTP, donc la
  // valeur qui arrive n'est pas forcément celle qu'un <select> propose.
  if (!REGISTRATION_STATUSES.includes(status)) {
    return { ok: false, error: "Statut inconnu." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workshop_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) return { ok: false, error: "Impossible de mettre à jour le statut." };

  revalidatePath("/admin/ateliers");
  return { ok: true };
}

export async function deleteRegistration(registrationId: number): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workshop_registrations")
    .delete()
    .eq("id", registrationId);

  if (error) return { ok: false, error: "Impossible de supprimer cette inscription." };

  revalidatePath("/admin/ateliers");
  return { ok: true };
}
