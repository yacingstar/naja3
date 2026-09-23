"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/adminAuth";
import type { ActionResult } from "@/lib/actionResult";
import type { OrderStatus } from "@/lib/orderStatus";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<ActionResult> {
  await requireAdminUser();
  const supabase = createAdminClient();

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { ok: false, error: "Impossible de mettre à jour le statut." };

  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin/commandes");
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
