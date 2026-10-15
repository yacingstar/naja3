"use client";

import { useState, useTransition } from "react";
import {
  deleteRegistration,
  updateRegistrationStatus,
} from "@/app/admin/(espace)/ateliers/actions";
import { Spinner } from "@/components/admin/AdminButton";
import { formatDateTimeShort } from "@/lib/format";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/registrationStatus";

// Pastilles cerclées de noir, comme StatusBadge pour les commandes — et pour la
// même raison : jamais la couleur seule pour porter l'information, le mot est
// toujours écrit.
//
// L'ordre suit le parcours d'un inscrit : il s'inscrit (jaune, il y a quelque
// chose à faire — l'appeler), il confirme (vert d'eau), il vient (noir plein,
// c'est fini), il annule (gris, barré, sans couleur).
const STYLES: Record<RegistrationStatus, string> = {
  inscrit: "border-encre bg-[#ffd166] text-encre",
  confirmé: "border-encre bg-[#8ad4c1] text-encre",
  venu: "border-encre bg-encre text-papier",
  annulé: "border-encre/25 bg-papier text-encre/50 line-through",
};

type Registration = {
  id: number;
  createdAt: string;
  status: RegistrationStatus;
  firstName: string;
  lastName: string;
  phone: string;
};

export function RegistrationRow({ registration }: { registration: Registration }) {
  const [status, setStatus] = useState(registration.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Le numéro tel qu'on le compose en Algérie. Stocké tel que la personne l'a
  // tapé (voir analyserTelephone, qui valide sans réécrire), donc on remet
  // juste des espaces pour qu'il se lise.
  const lisible = registration.phone.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4");

  function changerStatut(next: RegistrationStatus) {
    const precedente = status;
    // Optimiste : le <select> bouge tout de suite, et revient en arrière si le
    // serveur refuse. Même geste que OrderStatusControl.
    setStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateRegistrationStatus(registration.id, next);
        if (!result.ok) {
          setStatus(precedente);
          setError(result.error);
        }
      } catch {
        setStatus(precedente);
        setError("Enregistrement impossible. Réessayez.");
      }
    });
  }

  function supprimer() {
    if (
      !confirm(
        `Retirer ${registration.firstName} ${registration.lastName} de la liste ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteRegistration(registration.id);
        if (!result.ok) setError(result.error);
      } catch {
        setError("Suppression impossible. Réessayez.");
      }
    });
  }

  return (
    <li className="rounded-2xl border-2 border-encre/12 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <span className="min-w-0 flex-1 font-heading text-base font-semibold">
          {registration.firstName} {registration.lastName}
        </span>
        {/* Le numéro est le geste principal de cet écran : on appelle pour
            confirmer. En lien tel: plutôt qu'en texte, pour que ce soit un tap
            sur un téléphone — ce qui est l'appareil depuis lequel la patronne
            fait ses appels. */}
        <a
          href={`tel:${registration.phone}`}
          className="font-medium underline decoration-encre/25 underline-offset-4 transition hover:decoration-encre"
        >
          {lisible}
        </a>
        <span
          className={`inline-block rounded-full border-2 px-3 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-encre/10 pt-2">
        <select
          value={status}
          onChange={(e) => changerStatut(e.target.value as RegistrationStatus)}
          disabled={pending}
          aria-label={`Statut de ${registration.firstName} ${registration.lastName}`}
          className="input w-auto py-1.5 text-sm capitalize"
        >
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={supprimer}
          disabled={pending}
          className="text-sm font-medium text-encre/50 underline underline-offset-4 transition hover:text-red-700 disabled:opacity-60"
        >
          Retirer
        </button>

        {pending ? (
          <span className="flex items-center gap-2 text-sm text-encre/50">
            <Spinner /> Enregistrement…
          </span>
        ) : null}

        <time
          dateTime={registration.createdAt}
          className="ml-auto text-[13px] font-medium text-encre/50"
        >
          Inscrit le {formatDateTimeShort(registration.createdAt)}
        </time>
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}
