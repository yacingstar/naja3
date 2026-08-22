"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Set-a-new-password form, reached from a recovery email via /auth/confirm.
//
// Outside /admin on purpose: proxy.ts bounces anyone without a session away
// from /admin, and some Supabase email flows deliver the session in the URL
// hash, which only exists client-side — the redirect would fire before the
// browser ever got a chance to read it. Being public costs nothing, because
// updateUser() below still requires a valid recovery session; without one
// Supabase rejects the change.
export default function NouveauMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The browser client has detectSessionInUrl on, so a hash-delivered
    // recovery token is already consumed by the time this runs.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "Impossible de modifier le mot de passe. Le lien a peut-être expiré — demandez-en un nouveau.",
      );
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-center font-heading text-2xl">Nouveau mot de passe</h1>

      {checking ? (
        <p className="mt-8 text-center text-sm text-encre/60">Vérification du lien…</p>
      ) : !hasSession ? (
        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-encre/70">
            Ce lien n&apos;est plus valide. Les liens de récupération expirent, ne
            servent qu&apos;une fois, et doivent être ouverts dans le navigateur
            qui les a demandés.
          </p>
          <a
            href="/admin/connexion"
            className="inline-block rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90"
          >
            Demander un nouveau lien
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-encre/70">
              Nouveau mot de passe
            </span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-encre/70">
              Confirmer
            </span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </main>
  );
}
