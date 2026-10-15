"use client";

import { useEffect } from "react";

import { AdminButton } from "@/components/admin/AdminButton";

// Le filet de l'espace admin.
//
// Il n'existait pas, et c'est exactement ce qui a coûté une heure : sans lui,
// une erreur dans une page d'admin affiche « This page couldn't load. Reload to
// try again » — l'écran par défaut de Next, qui ne dit RIEN sur ce qui a
// échoué. Ni quel écran, ni pourquoi. Impossible de savoir si c'était la base,
// le réseau ou une donnée surprenante.
//
// Celui-ci affiche le message et le `digest`. Le digest est la seule chose qui
// relie cette page à la ligne correspondante dans les journaux de la fonction
// Netlify : sans lui, chercher l'erreur dans les journaux d'une journée entière
// revient à chercher une aiguille. C'est pour ça qu'il est affiché, et pas
// seulement journalisé.
//
// Le message technique est laissé tel quel, en anglais et brut, sous le texte
// en français. Ce n'est pas de la négligence : le traduire ou l'adoucir
// reviendrait à jeter la seule information qui permet de comprendre. Il est
// simplement mis à part, petit, pour que la personne qui gère la boutique
// lise d'abord ce qui la concerne — et puisse me le recopier si besoin.
export default function AdminErreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Dans la console du navigateur en plus de l'affichage : c'est là qu'on le
    // retrouve quand on rouvre la page plus tard.
    console.error("[admin]", error);
  }, [error]);

  return (
    <div>
      <h1 className="font-heading text-[34px] leading-tight font-bold tracking-[-.02em]">
        Cet écran n&apos;a pas pu s&apos;afficher.
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        Vos données ne sont pas touchées — rien n&apos;a été perdu ni modifié.
        Réessayez, et si ça recommence, recopiez-moi le message technique en bas
        de cet encadré.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AdminButton onClick={reset}>Réessayer</AdminButton>
        <a
          href="/admin"
          className="rounded-full border-2 border-encre/20 px-6 py-2.5 text-sm font-semibold text-encre transition hover:border-encre hover:bg-encre/5"
        >
          Retour à l&apos;accueil
        </a>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-encre/15 bg-encre/[.03] px-4 py-3">
        <p className="text-[13px] font-semibold tracking-[.05em] text-encre/50 uppercase">
          Message technique
        </p>
        <p className="mt-1.5 font-mono text-[13px] break-words text-encre/70">
          {error.message || "Erreur sans message."}
        </p>
        {error.digest ? (
          <p className="mt-1.5 font-mono text-[13px] break-words text-encre/50">
            digest: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
