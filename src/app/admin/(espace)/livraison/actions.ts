"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/adminAuth";
import type { ActionResult } from "@/lib/actionResult";
import { createAdminClient } from "@/lib/supabase/admin";

export async function upsertDeliveryRate(input: {
  wilaya: string;
  domicilePrice: number;
  stopdeskPrice: number | null;
}): Promise<ActionResult> {
  await requireAdminUser();

  const wilaya = input.wilaya.trim();
  if (!wilaya) return { ok: false, error: "Le nom de la wilaya est obligatoire." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("delivery_rates").upsert(
    {
      wilaya,
      domicile_price: input.domicilePrice,
      stopdesk_price: input.stopdeskPrice,
    },
    { onConflict: "wilaya" },
  );

  if (error) return { ok: false, error: "Impossible d'enregistrer ce tarif." };

  revalidatePath("/admin/livraison");
  return { ok: true };
}

export async function deleteDeliveryRate(wilaya: string): Promise<ActionResult> {
  await requireAdminUser();

  const supabase = createAdminClient();
  const { error } = await supabase.from("delivery_rates").delete().eq("wilaya", wilaya);

  if (error) {
    // Most likely cause: orders.wilaya references this row (ON DELETE
    // RESTRICT, see Phase 1) — a wilaya that's ever been ordered from can't
    // be deleted.
    return {
      ok: false,
      error:
        "Impossible de supprimer cette wilaya — elle est peut-être utilisée par une commande existante.",
    };
  }

  revalidatePath("/admin/livraison");
  return { ok: true };
}
