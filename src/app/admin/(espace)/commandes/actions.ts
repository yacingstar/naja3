"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/adminAuth";
import type { ActionResult } from "@/lib/actionResult";
import type { OrderStatus } from "@/lib/orderStatus";
import { createAdminClient } from "@/lib/supabase/admin";

// La colonne de date que chaque statut fait écrire. « nouvelle » et
// « annulée » n'en ont pas : une commande non encore traitée n'a pas de date
// à retenir, et une annulation se date par sa création, comme avant.
//
// Ces trois colonnes viennent de la migration 20260930173000 ; avant elle,
// l'information n'existait pas du tout et aucun délai n'était calculable.
const DATE_DU_STATUT: Partial<Record<OrderStatus, "confirmed_at" | "shipped_at" | "delivered_at">> = {
  "confirmée": "confirmed_at",
  "expédiée": "shipped_at",
  "livrée": "delivered_at",
};

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<ActionResult> {
  await requireAdminUser();
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = { status };
  const colonne = DATE_DU_STATUT[status];

  if (colonne) {
    // Relue avant d'être écrite, pour ne poser la date que si elle est encore
    // vide. Sans cette précaution, corriger une commande passée par erreur de
    // « livrée » à « confirmée » puis la remettre à « livrée » remplacerait la
    // vraie date de livraison par celle de la correction — et fausserait tous
    // les délais, en silence.
    const { data: actuelle } = await supabase
      .from("orders")
      .select("confirmed_at, shipped_at, delivered_at")
      .eq("id", orderId)
      .maybeSingle();

    if (actuelle && !actuelle[colonne]) patch[colonne] = new Date().toISOString();
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { ok: false, error: "Impossible de mettre à jour le statut." };

  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin/commandes");
  // Les deux écrans de chiffres lisent ces statuts, donc ils changent aussi.
  revalidatePath("/admin");
  revalidatePath("/admin/statistiques");
  return { ok: true };
}

export async function updateOrderPrepared(orderId: number, prepared: boolean): Promise<ActionResult> {
  await requireAdminUser();
  if (!Number.isSafeInteger(orderId) || orderId <= 0 || typeof prepared !== "boolean") {
    return { ok: false, error: "Commande invalide." };
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("orders")
    .update({ prepared_at: prepared ? new Date().toISOString() : null })
    .eq("id", orderId).select("id").maybeSingle();
  if (error || !data) return {
    ok: false,
    error: "Impossible d'enregistrer : vérifiez que la migration prepared_at a été appliquée.",
  };
  revalidatePath("/admin");
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);
  return { ok: true };
}

export async function updateInternalNotes(
  orderId: number,
  notes: string,
): Promise<ActionResult> {
  await requireAdminUser();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ internal_notes: notes.trim() || null })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Impossible d'enregistrer la note." };

  revalidatePath(`/admin/commandes/${orderId}`);
  return { ok: true };
}

/**
 * Supprime définitivement une commande et ses lignes.
 *
 * C'est irréversible et sans filet : ni corbeille, ni journal. Une commande
 * effacée disparaît aussi des chiffres de l'accueil — le mois passé peut donc
 * changer après coup. Pour une commande qui n'aboutit pas, le statut
 * « annulée » reste le bon geste : il la sort des ventes tout en gardant la
 * trace. La suppression est là pour les vraies erreurs (un essai, un doublon).
 *
 * `order_items` est effacé d'abord, à la main : la clé étrangère est en
 * RESTRICT (voir la note de deleteProduct), donc supprimer la commande seule
 * échouerait dès qu'elle contient un article.
 */
export async function deleteOrder(orderId: number): Promise<ActionResult> {
  await requireAdminUser();
  const supabase = createAdminClient();

  const { error: erreurLignes } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);
  if (erreurLignes) {
    return { ok: false, error: "Impossible de supprimer les articles de cette commande." };
  }

  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: "Impossible de supprimer cette commande." };

  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  return { ok: true };
}
