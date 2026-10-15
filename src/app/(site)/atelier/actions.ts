"use server";

import { after } from "next/server";

import { notifyNewRegistration } from "@/lib/notify/telegram";
import { analyserTelephone, decouperNom } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export type InscriptionInput = {
  workshopId: number;
  // Un seul champ côté visiteur, comme sur le bon de commande. Le découpage en
  // prénom / nom se fait ici : c'est une règle sur la DONNÉE, la table garde
  // deux colonnes, et deux découpages différents selon l'écran finiraient par
  // ne plus raconter la même chose.
  nomComplet: string;
  phone: string;
};

export type InscriptionResult = { ok: true } | { ok: false; error: string };

/**
 * Le seul chemin d'écriture d'une inscription. Aucune confiance dans ce qui
 * arrive du client — même discipline que placeOrder.
 *
 * Ce qui est revérifié ici, et pourquoi chacun :
 *
 *   * que l'atelier existe : l'identifiant vient du navigateur, et un
 *     identifiant inventé ne doit pas produire une ligne orpheline ;
 *   * que l'atelier n'a pas encore commencé : la page cache le formulaire une
 *     fois la date passée, mais cacher un formulaire n'est pas fermer une
 *     porte. Quelqu'un qui garde l'onglet ouvert la veille du dernier jour
 *     enverrait sinon une inscription pour un atelier terminé ;
 *   * le nom et le téléphone : les mêmes règles que le formulaire, mais
 *     appliquées ici pour de vrai (`analyserTelephone`, `decouperNom`). Deux
 *     copies de ces règles divergeraient — c'est exactement l'écart qui laisse
 *     passer un numéro invalide, ou refuse un numéro correct.
 */
export async function inscrireAtelier(input: InscriptionInput): Promise<InscriptionResult> {
  if (!Number.isSafeInteger(input.workshopId) || input.workshopId <= 0) {
    return { ok: false, error: "Atelier introuvable." };
  }

  const { firstName, lastName } = decouperNom(input.nomComplet);

  if (!firstName) {
    return { ok: false, error: "Merci d'indiquer votre nom." };
  }

  const telephone = analyserTelephone(input.phone);
  if (!telephone.ok) {
    return { ok: false, error: telephone.erreur };
  }

  const supabase = createAdminClient();

  const { data: workshop } = await supabase
    .from("workshops")
    .select("id, title, starts_at")
    .eq("id", input.workshopId)
    .maybeSingle();

  if (!workshop) {
    return { ok: false, error: "Cet atelier n'existe plus." };
  }

  if (new Date(workshop.starts_at).getTime() <= Date.now()) {
    return { ok: false, error: "Les inscriptions pour cet atelier sont closes." };
  }

  const phone = input.phone.trim();

  const { error } = await supabase.from("workshop_registrations").insert({
    workshop_id: workshop.id,
    first_name: firstName,
    last_name: lastName,
    phone,
  });

  if (error) {
    // 23505 = unique_violation, c'est-à-dire la contrainte
    // (workshop_id, phone) de la migration. C'est le double clic, ou la
    // personne qui s'inscrit deux fois « pour être sûre ».
    //
    // Le message le dit franchement plutôt que de faire semblant d'avoir
    // enregistré : sinon elle croit s'être inscrite, la liste ne bouge pas, et
    // elle recommence — ce qui est pire que le doublon lui-même.
    if (error.code === "23505") {
      return { ok: false, error: "Ce numéro est déjà inscrit à cet atelier." };
    }
    return { ok: false, error: "Une erreur est survenue, merci de réessayer." };
  }

  // The side effect of a completed sign-up, after it is safely in the database
  // and only on the success path — a rejected registration must never be
  // announced to the owner. `after` runs it once the response has already gone
  // out, so the visitor's form clears without waiting on Telegram. See
  // next/dist/docs .../functions/after.md.
  //
  // `notifyNewRegistration` never rejects by contract, so no catch is needed
  // here — and a Telegram outage must not be able to turn a successful
  // registration into an error.
  after(() =>
    notifyNewRegistration({
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      startsAt: workshop.starts_at,
      firstName,
      lastName,
      phone,
    }),
  );

  return { ok: true };
}
