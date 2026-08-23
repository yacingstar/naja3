"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/admin/AdminButton";
import { updateOrderStatus } from "@/app/admin/(espace)/commandes/actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orderStatus";

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message?: string } | null>(null);

  function handleChange(next: OrderStatus) {
    const previous = value;
    setValue(next);
    setFeedback(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (!result.ok) {
        setValue(previous);
        setFeedback({ ok: false, message: result.error });
        return;
      }
      setFeedback({ ok: true });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        disabled={isPending}
        className="input capitalize"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      {isPending ? (
        <span className="flex items-center gap-2 text-sm text-encre/50">
          <Spinner /> Enregistrement…
        </span>
      ) : feedback?.ok ? (
        <span className="text-sm text-sauge">Enregistré ✓</span>
      ) : feedback && !feedback.ok ? (
        <span className="text-sm text-red-700">{feedback.message}</span>
      ) : null}
    </div>
  );
}
