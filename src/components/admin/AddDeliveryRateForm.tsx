"use client";

import { AdminButton } from "@/components/admin/AdminButton";
import { useState, useTransition } from "react";
import { upsertDeliveryRate } from "@/app/admin/(espace)/livraison/actions";

export function AddDeliveryRateForm() {
  const [wilaya, setWilaya] = useState("");
  const [domicile, setDomicile] = useState("0");
  const [stopdesk, setStopdesk] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertDeliveryRate({
        wilaya,
        domicilePrice: Number(domicile) || 0,
        stopdeskPrice: stopdesk.trim() === "" ? null : Number(stopdesk) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWilaya("");
      setDomicile("0");
      setStopdesk("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-encre/10 bg-blush/20 p-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre/70">Wilaya</span>
        <input
          required
          value={wilaya}
          onChange={(e) => setWilaya(e.target.value)}
          placeholder="59 Aflou"
          className="input w-48"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre/70">Domicile (DA)</span>
        <input
          type="number"
          min={0}
          value={domicile}
          onChange={(e) => setDomicile(e.target.value)}
          className="input w-28"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre/70">Stopdesk (DA)</span>
        <input
          type="number"
          min={0}
          value={stopdesk}
          onChange={(e) => setStopdesk(e.target.value)}
          placeholder="—"
          className="input w-28"
        />
      </label>
      <AdminButton type="submit" size="sm" pending={isPending} disabled={isPending || !wilaya.trim()}>Ajouter</AdminButton>
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
