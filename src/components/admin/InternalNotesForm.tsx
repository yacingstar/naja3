"use client";

import { AdminButton } from "@/components/admin/AdminButton";
import { useState, useTransition } from "react";
import { updateInternalNotes } from "@/app/admin/(espace)/commandes/actions";

export function InternalNotesForm({
  orderId,
  initialNotes,
}: {
  orderId: number;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message?: string } | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await updateInternalNotes(orderId, notes);
      setFeedback(result.ok ? { ok: true } : { ok: false, message: result.error });
    });
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setFeedback(null);
        }}
        rows={4}
        placeholder="Note interne, non visible par la cliente ou le client."
        className="input"
      />
      <AdminButton className="mt-2" variant="secondary" size="sm" type="button" onClick={handleSave} pending={isPending} pendingLabel="Enregistrement…">Enregistrer</AdminButton>
      {feedback?.ok ? (
        <span className="ml-3 text-sm text-sauge">Enregistré ✓</span>
      ) : feedback && !feedback.ok ? (
        <span className="ml-3 text-sm text-red-700">{feedback.message}</span>
      ) : null}
    </div>
  );
}
