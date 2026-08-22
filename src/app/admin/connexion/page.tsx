"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// No public sign-up anywhere in the app — the admin account is created by
// hand in the Supabase dashboard (Authentication -> Users).
export default function ConnexionPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    // /auth/confirm sends people back here when a recovery link is expired,
    // already used, or opened in a different browser than it was requested from.
    searchParams.get("erreur") === "lien"
      ? "Ce lien de récupération n'est plus valide. Demandez-en un nouveau ci-dessous."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    // redirectTo must also be listed under Authentication -> URL Configuration
    // -> Redirect URLs in the Supabase dashboard, or Supabase silently falls
    // back to the Site URL — which is exactly how these links ended up on the
    // homepage.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/nouveau-mot-de-passe`,
    });

    setSubmitting(false);
    if (resetError) {
      setError("Impossible d'envoyer l'email. Réessayez dans un instant.");
      return;
    }
    // Deliberately not revealing whether the address exists.
    setResetSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  if (resetMode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="text-center font-heading text-2xl">Mot de passe oublié</h1>
        {resetSent ? (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-encre/70">
              Si un compte existe pour cette adresse, un lien vient d&apos;être
              envoyé. Ouvrez-le dans ce même navigateur.
            </p>
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
              }}
              className="text-sm text-encre/60 underline hover:text-encre"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-encre/70">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Envoi…" : "Envoyer le lien"}
            </button>
            <button
              type="button"
              onClick={() => setResetMode(false)}
              className="block w-full text-center text-sm text-encre/60 underline hover:text-encre"
            >
              Retour à la connexion
            </button>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-center font-heading text-2xl">Naja — gestion</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-encre/70">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-encre/70">
            Mot de passe
          </span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
        <button
          type="button"
          onClick={() => {
            setResetMode(true);
            setError(null);
          }}
          className="block w-full text-center text-sm text-encre/60 underline hover:text-encre"
        >
          Mot de passe oublié ?
        </button>
      </form>
    </main>
  );
}
