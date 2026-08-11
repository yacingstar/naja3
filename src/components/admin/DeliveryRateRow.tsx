"use client";

import { useState, useTransition } from "react";
import {
  deleteDeliveryRate,
  upsertDeliveryRate,
} from "@/app/admin/(espace)/livraison/actions";
import type { DeliveryRate } from "@/lib/deliveryRates";

export function DeliveryRateRow({ rate }: { rate: DeliveryRate }) {
  const [domicile, setDomicile] = useState(String(rate.domicilePrice));
  const [stopdesk, setStopdesk] = useState(
    rate.stopdeskPrice != null ? String(rate.stopdeskPrice) : "",
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message?: string } | null>(null);

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertDeliveryRate({
        wilaya: rate.wilaya,
        domicilePrice: Number(domicile) || 0,
        stopdeskPrice: stopdesk.trim() === "" ? null : Number(stopdesk) || 0,
      });
      setFeedback(result.ok ? { ok: true } : { ok: false, message: result.error });
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer ${rate.wilaya} ?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteDeliveryRate(rate.wilaya);
      if (!result.ok) setFeedback({ ok: false, message: result.error });
    });
  }

  return (
    <tr className="border-b border-encre/5 align-top">
      <td className="py-2 pr-4">{rate.wilaya}</td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min={0}
          value={domicile}
          onChange={(e) => {
            setDomicile(e.target.value);
            setFeedback(null);
          }}
          className="input w-28"
        />
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min={0}
          value={stopdesk}
          onChange={(e) => {
            setStopdesk(e.target.value);
            setFeedback(null);
          }}
          placeholder="—"
          className="input w-28"
        />
      </td>
      <td className="py-2 pr-4 whitespace-nowrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-full border border-encre/20 px-3 py-1 text-xs hover:border-encre disabled:opacity-60"
        >
          {isPending ? "…" : "Enregistrer"}
        </button>
        {feedback?.ok ? <span className="ml-2 text-xs text-sauge">✓</span> : null}
      </td>
      <td className="py-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-encre/40 hover:text-encre"
        >
          Supprimer
        </button>
        {feedback && !feedback.ok ? (
          <p className="mt-1 max-w-[16rem] text-xs text-red-700">{feedback.message}</p>
        ) : null}
      </td>
    </tr>
  );
}
