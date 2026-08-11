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
