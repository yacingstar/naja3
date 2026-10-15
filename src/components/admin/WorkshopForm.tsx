"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createWorkshop,
  deleteWorkshop,
  updateWorkshop,
  type WorkshopInput,
} from "@/app/admin/(espace)/ateliers/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { versDatetimeLocal } from "@/lib/format";

type ExistingWorkshop = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  price: number;
  deposit: number;
  seats: number | null;
};

// Le formulaire de création ET d'édition, comme ProductForm : les sept champs
// sont les mêmes, et deux copies divergeraient à la première retouche — c'est
// toujours le formulaire de création qu'on met à jour et celui d'édition qu'on
// oublie.
export function WorkshopForm({ workshop }: { workshop?: ExistingWorkshop }) {
  const router = useRouter();
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [description, setDescription] = useState(workshop?.description ?? "");
  // Les deux valeurs sont converties ici, côté serveur, en heure d'Alger (voir
  // versDatetimeLocal) : les calculer dans le navigateur donnerait une autre
  // valeur initiale dès que la machine n'est pas à l'heure d'Alger.
  const [startsAt, setStartsAt] = useState(
    workshop ? versDatetimeLocal(workshop.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    workshop?.endsAt ? versDatetimeLocal(workshop.endsAt) : "",
  );
  const [location, setLocation] = useState(workshop?.location ?? "");
  const [price, setPrice] = useState(String(workshop?.price ?? ""));
  const [deposit, setDeposit] = useState(
    workshop?.deposit ? String(workshop.deposit) : "",
  );
  const [seats, setSeats] = useState(workshop?.seats != null ? String(workshop.seats) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: WorkshopInput = {
      title,
      description,
      startsAt,
      endsAt,
      location,
      // `Number("")` vaut 0, ce qui est exactement ce qu'on veut pour le prix :
      // un champ laissé vide veut dire gratuit. Pour les places, ce serait faux
      // — 0 place et « je n'annonce rien » ne s'écrivent pas pareil — d'où le
      // test explicite plus haut.
      price: Number(price) || 0,
      deposit: Number(deposit) || 0,
      seats: seats.trim() === "" ? null : Number(seats),
    };

    const result = workshop
      ? await updateWorkshop(workshop.id, input)
      : await createWorkshop(input);

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (workshop) {
      router.refresh();
      setSubmitting(false);
    } else if (result.data) {
      router.push(`/admin/ateliers/${result.data.id}`);
    }
  }

  async function handleDelete() {
    if (!workshop) return;
    if (
      !confirm(
        `Supprimer "${workshop.title}" et ses inscriptions ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await deleteWorkshop(workshop.id);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push("/admin/ateliers");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Titre</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Atelier veilleuse"
          className="input"
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-encre/70">Description</span>
          <span className="text-xs text-encre/45">Les retours à la ligne sont gardés</span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="input"
          placeholder={
            "Ce qu'on y fait, qui l'anime, ce qu'on repart avec.\n\nC'est le texte affiché sur la page de l'atelier."
          }
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-encre/70">Début</span>
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-encre/70">
            Fin (optionnel)
          </span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="input"
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-encre/45">
        Heures d&apos;Alger. Laissez la fin vide pour n&apos;annoncer qu&apos;une
        heure de début.
      </p>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-encre/70">Lieu</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input"
          placeholder="Salle, adresse, quartier…"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-encre/70">Prix (DA)</span>
            <span className="text-xs text-encre/45">0 = gratuit</span>
          </span>
          <input
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input"
            placeholder="4500"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-encre/70">Acompte (DA)</span>
            <span className="text-xs text-encre/45">0 = aucun</span>
          </span>
          <input
            type="number"
            min={0}
            step={100}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="input"
            placeholder="2000"
          />
        </label>

        {/* Troisième champ numérique de la même famille, donc dans la même
            grille — il tombe seul sur la deuxième ligne, en demi-largeur, ce
            qui est exactement le poids qu'il mérite. */}
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-encre/70">Places</span>
            <span className="text-xs text-encre/45">vide = rien d&apos;annoncé</span>
          </span>
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            className="input"
            placeholder="8"
          />
        </label>
      </div>

      {/* L'acompte n'est pas une décoration : c'est lui qui fait la différence
          entre « je m'inscris » et « ma place est tenue ». Écrit ici pour que
          personne ne le laisse à zéro en croyant remplir un champ optionnel. */}
      <p className="-mt-2 text-xs text-encre/45">
        Le montant à verser d&apos;avance pour valider une place. S&apos;il est
        supérieur à zéro, la page le dit au visiteur et le rappelle après
        l&apos;inscription.
      </p>

      {/* Le nombre de places est une ANNONCE, pas une limite : il ne ferme rien.
          Écrit ici pour que personne — la patronne dans six mois, ou moi —
          ne cherche pourquoi le formulaire accepte une 13e inscription. */}
      <p className="text-xs text-encre/45">
        Les places sont affichées sur le site mais ne bloquent pas les
        inscriptions : vous gardez la main sur la liste.
      </p>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <AdminButton
          type="submit"
          pending={submitting}
          pendingLabel="Enregistrement…"
        >
          {workshop ? "Enregistrer" : "Créer l'atelier"}
        </AdminButton>
        {workshop ? (
          <AdminButton
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            Supprimer
          </AdminButton>
        ) : null}
      </div>
    </form>
  );
}
