"use client";

import { useState, useTransition } from "react";
import { updateInternalNotes } from "@/app/admin/(espace)/commandes/actions";

// Les deux notes d'une commande, dans la LISTE et plus seulement sur la fiche.
//
// C'est la demande de la patronne : « pour que je rate aucune remarque ». La
// liste montrait déjà la couleur et la case « Prête », mais pas un mot des
// notes — il fallait ouvrir les commandes une par une pour découvrir qu'une
// cliente avait demandé un prénom gravé ou une livraison après 17 h. Une
// remarque qu'on ne voit qu'en cliquant est une remarque qu'on finit par
// manquer, et c'est exactement ce qui arrive un jour de douze commandes.
//
// Les deux notes ne se ressemblent pas et ne doivent pas se ressembler :
//
//   - celle de la CLIENTE arrive avec la commande et ne se modifie pas. Elle
//     est cerclée de lueur, la couleur d'alerte douce de la boutique, parce
//     que c'est la seule chose de la ligne qu'on ne peut pas deviner du reste.
//   - la SIENNE s'écrit ici même. Rouvrir la fiche pour ajouter trois mots
//     (« rappeler demain », « attend sa paye ») coûtait deux navigations ;
//     maintenant elle les tape dans la liste, là où elle est déjà.
//
// Tout ce composant vit HORS du <Link> de la ligne — sinon écrire dans la note
// ouvrirait la commande au premier clic.
export function OrderNotes({
  orderId,
  notesClient,
  internalNotes,
}: {
  orderId: number;
  notesClient: string | null;
  internalNotes: string | null;
}) {
  // `enregistre` est ce que la base contient, `brouillon` ce qu'elle est en
  // train de taper. Les séparer permet d'annuler sans rien perdre, et évite
  // d'afficher comme sauvegardé un texte qui ne l'est pas encore.
  const [enregistre, setEnregistre] = useState((internalNotes ?? "").trim());
  const [brouillon, setBrouillon] = useState(enregistre);
  const [ouvert, setOuvert] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function ouvrir() {
    setBrouillon(enregistre);
    setErreur(null);
    setOuvert(true);
  }

  function enregistrer() {
    const texte = brouillon.trim();
    setErreur(null);
    startTransition(async () => {
      try {
        const result = await updateInternalNotes(orderId, texte);
        if (!result.ok) {
          setErreur(result.error);
          return;
        }
        setEnregistre(texte);
        setOuvert(false);
      } catch {
        setErreur("Enregistrement impossible. Réessayez.");
      }
    });
  }

  const note = (notesClient ?? "").trim();

  return (
    <div className="space-y-2 px-4 pb-3">
      {note ? (
        <p className="rounded-xl border-2 border-lueur bg-lueur/15 px-3 py-2 text-sm font-medium">
          <span className="font-semibold">Note du client — </span>
          {note}
        </p>
      ) : null}

      {ouvert ? (
        <div>
          <textarea
            value={brouillon}
            autoFocus
            onChange={(e) => setBrouillon(e.target.value)}
            rows={2}
            placeholder="Pour vous seulement — jamais visible par la cliente."
            className="input"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enregistrer}
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-encre bg-encre px-4 text-sm font-semibold text-papier transition disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              disabled={pending}
              className="text-sm font-semibold text-encre/60 underline underline-offset-4 transition hover:text-encre"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={ouvrir}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl border-2 border-dashed border-encre/20 px-3 py-1.5 text-left text-sm font-medium transition hover:border-encre/50"
        >
          {enregistre ? (
            <>
              <span className="shrink-0 font-semibold text-encre/55">Ma note —</span>
              <span className="min-w-0">{enregistre}</span>
            </>
          ) : (
            <span className="text-encre/50">+ Ajouter ma note</span>
          )}
        </button>
      )}

      {erreur ? (
        <p role="alert" className="text-sm text-red-700">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
