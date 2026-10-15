"use client";

import { useState } from "react";
import { inscrireAtelier } from "@/app/(site)/atelier/actions";
import { analyserTelephone } from "@/lib/phone";

// L'inscription à un atelier. Deux champs, et rien d'autre.
//
// Le formulaire de commande a été réduit à un seul champ de nom pour une raison
// observée sur un téléphone : chaque champ en plus est un clavier qui s'ouvre et
// une occasion d'abandonner. Le même raisonnement vaut ici, à plus forte raison —
// une inscription est un geste de curiosité, pas un achat, et quelqu'un qui
// hésite n'a aucune raison de remplir un formulaire.
//
// Pas de redirection au succès : il n'y a pas de page de confirmation pour un
// atelier. Le formulaire se remplace lui-même par la confirmation, avec la date
// et le lieu rappelés — c'est-à-dire exactement ce qu'on veut relire une fois
// inscrit, sans avoir à faire défiler la page.
export function WorkshopSignupForm({
  workshopId,
  dateTexte,
  location,
}: {
  workshopId: number;
  dateTexte: string;
  location: string;
}) {
  const [nomComplet, setNomComplet] = useState("");
  const [phone, setPhone] = useState("");
  const [erreurTelephone, setErreurTelephone] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [inscrit, setInscrit] = useState(false);

  if (inscrit) {
    return (
      <div
        role="status"
        className="rounded-[2.5rem] border-[3px] border-encre bg-sauge/40 p-6 sm:p-8"
      >
        <p className="font-heading text-3xl leading-tight font-semibold">
          C&apos;est noté !
        </p>
        <p className="mt-3 leading-relaxed text-encre/80">
          Votre place est réservée. On vous appelle pour confirmer — répondez
          surtout, c&apos;est ce coup de fil qui valide l&apos;inscription.
        </p>
        <dl className="mt-5 space-y-1.5 border-t-2 border-encre/15 pt-5 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-encre/60">Quand :</dt>
            <dd className="font-semibold">{dateTexte}</dd>
          </div>
          {location ? (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-encre/60">Où :</dt>
              <dd className="font-semibold">{location}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // La même règle que le serveur, importée du même fichier — pas une copie.
    // Elle sert ici à montrer l'erreur sous le champ qu'on corrige ; le serveur
    // la réapplique pour de vrai (voir inscrireAtelier).
    const telephone = analyserTelephone(phone);
    if (!telephone.ok) {
      setErreurTelephone(telephone.erreur);
      return;
    }

    setEnvoi(true);
    setErreur(null);

    const result = await inscrireAtelier({ workshopId, nomComplet, phone });

    if (!result.ok) {
      setErreur(result.error);
      setEnvoi(false);
      return;
    }

    setInscrit(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2.5rem] border-[3px] border-encre bg-blush/20 p-6 sm:p-8"
    >
      <h2 className="font-heading text-2xl font-semibold">Je m&apos;inscris</h2>
      <p className="mt-1.5 text-sm text-encre/65">
        Deux champs, et on vous rappelle pour confirmer votre place.
      </p>

      <div className="mt-5 space-y-4">
        {/* Un seul champ de nom, comme sur le bon de commande : le serveur
            redécoupe en prénom / nom pour la base — voir decouperNom. */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-encre/70">Nom complet</span>
          <input
            required
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            autoComplete="name"
            placeholder="Amina Belkacem"
            className="input"
          />
        </label>

        {/* L'erreur de téléphone vit SOUS son champ, pas auprès du bouton :
            c'est là qu'on la corrige. Même traitement que DirectOrderForm. */}
        <div>
          <label className="block">
            <span className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-encre/70">Téléphone</span>
              <span className="text-xs text-encre/45">On vous appelle pour confirmer</span>
            </span>
            <input
              required
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (erreurTelephone) setErreurTelephone(null);
              }}
              autoComplete="tel"
              placeholder="05 / 06 / 07 XX XX XX XX"
              aria-invalid={erreurTelephone ? true : undefined}
              aria-describedby={erreurTelephone ? "erreur-telephone" : undefined}
              className="input"
            />
          </label>
          {erreurTelephone ? (
            <p
              id="erreur-telephone"
              role="alert"
              className="mt-1.5 text-[13px] font-medium text-red-700"
            >
              {erreurTelephone}
            </p>
          ) : null}
        </div>
      </div>

      {erreur ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {erreur}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={envoi}
        className="mt-6 w-full rounded-full bg-encre px-6 py-4 font-heading text-lg text-papier transition hover:bg-encre/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {envoi ? "Envoi en cours…" : "Réserver ma place"}
      </button>
    </form>
  );
}
