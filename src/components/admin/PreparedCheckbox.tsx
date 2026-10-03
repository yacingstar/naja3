"use client";

import { useState, useTransition } from "react";
import { updateOrderPrepared } from "@/app/admin/(espace)/commandes/actions";

// Independent of shipping status. Kept outside the order link so checking never navigates.
export function PreparedCheckbox({ orderId, preparedAt, available }: {
  orderId: number;
  preparedAt: string | null;
  available: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="px-4 pb-3">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-base font-medium">
        <input type="checkbox" checked={Boolean(preparedAt)} disabled={pending || !available}
          className="h-5 w-5 accent-green-700"
          onChange={(e) => {
            const checked = e.target.checked;
            setError(null);
            startTransition(async () => {
              try {
                const result = await updateOrderPrepared(orderId, checked);
                if (!result.ok) setError(result.error);
              } catch { setError("Enregistrement impossible. Réessayez."); }
            });
          }} />
        {pending ? "Enregistrement…" : preparedAt ? "✓ Prête — pas encore expédiée" : "Prête"}
      </label>
      {!available ? <p className="text-sm text-encre/60">Case disponible après installation de la migration SQL.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
