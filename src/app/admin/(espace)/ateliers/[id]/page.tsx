import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationRow } from "@/components/admin/RegistrationRow";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { getAdminWorkshop } from "@/lib/adminWorkshops";
import { formatDateAtelier } from "@/lib/format";

// La fiche d'un atelier : ce qui est annoncé (modifiable) et qui s'est inscrit.
//
// Les deux vivent sur la même page parce qu'ils se lisent ensemble : on modifie
// l'heure, puis on regarde combien de personnes sont déjà inscrites pour savoir
// s'il faut les prévenir. Séparer les deux aurait voulu dire faire l'aller-retour
// entre deux écrans à chaque fois.
export default async function AdminAtelierPage({
  params,
}: PageProps<"/admin/ateliers/[id]">) {
  const { id } = await params;
  const workshopId = Number(id);
  if (!Number.isSafeInteger(workshopId) || workshopId <= 0) notFound();

  const atelier = await getAdminWorkshop(workshopId);
  // null veut dire « pas trouvé » ou « lecture refusée » : dans les deux cas la
  // 404 est la bonne réponse, et l'admin est déjà authentifié par le layout.
  if (!atelier) notFound();

  return (
    <div>
      <Link
        href="/admin/ateliers"
        className="text-sm font-semibold text-encre/55 underline transition hover:text-encre"
      >
        ← Ateliers
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-heading text-[34px] leading-tight font-bold tracking-[-.02em]">
          {atelier.title}
        </h1>
        <span
          className={`inline-block rounded-full border-2 px-3 py-0.5 text-xs font-semibold ${
            atelier.aVenir
              ? "border-encre bg-[#8ad4c1] text-encre"
              : "border-encre/25 bg-papier text-encre/50"
          }`}
        >
          {atelier.aVenir ? "à venir" : "passé"}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-encre/65">
        {formatDateAtelier(atelier.startsAt)}
      </p>

      {/* ── Les inscrits, d'abord ─────────────────────────────────────────
          Au-dessus du formulaire, et pas en dessous. C'est ce qu'on vient
          regarder la plupart du temps, et modifier les horaires est le geste
          rare — l'inverse aurait mis le geste fréquent sous le pli. */}
      <section className="mt-7">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="font-heading text-[24px] leading-none font-bold tracking-[-.02em]">
            Inscrits
          </h2>
          <span className="font-heading text-base font-semibold text-encre/70">
            {atelier.inscrits}
            {atelier.seats != null ? ` / ${atelier.seats} places` : ""}
          </span>
          {atelier.annules > 0 ? (
            <span className="text-[13px] font-medium text-encre/50">
              {atelier.annules} annulé{atelier.annules > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {atelier.registrations.length === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-encre/20 px-4 py-6 text-center text-encre/60">
            Personne pour l&apos;instant. Les inscriptions arrivent ici dès
            qu&apos;elles sont envoyées depuis le site.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {atelier.registrations.map((r) => (
              <RegistrationRow key={r.id} registration={r} />
            ))}
          </ul>
        )}

        {/* Ce que ce nombre veut dire, écrit noir sur blanc : les places sont
            une annonce, pas une limite. Sans cette phrase, un 13 sur 12 se lit
            comme un bug alors que c'est le comportement voulu.
            Le chiffre est mis dedans plutôt qu'écrit en toutes lettres : c'est
            ce nombre-là qui est la frontière de la liste d'attente, et il se
            lit d'un coup d'œil sur une capture d'écran. */}
        {atelier.seats != null && atelier.inscrits > atelier.seats ? (
          <p className="mt-3 rounded-2xl border-2 border-encre bg-[#ffd166] px-4 py-3 text-sm font-medium">
            {atelier.inscrits - atelier.seats}{" "}
            {atelier.inscrits - atelier.seats === 1
              ? "personne est au-delà des"
              : "personnes sont au-delà des"}{" "}
            {atelier.seats} places annoncées — c&apos;est votre liste
            d&apos;attente. Les places ne bloquent rien : elles se disent, et
            vous décidez.
          </p>
        ) : null}
      </section>

      {/* ── Ce qui est annoncé ───────────────────────────────────────────── */}
      {!atelier.aVenir ? (
        <p className="mt-8 rounded-2xl border-[3px] border-encre/25 bg-encre/5 px-4 py-3 text-sm font-medium text-encre/70">
          Cet atelier est passé : le formulaire d&apos;inscription est fermé sur
          le site. Changez la date pour le rouvrir.
        </p>
      ) : null}

      <section className="mt-9 border-t-2 border-encre/12 pt-7">
        <h2 className="font-heading text-[24px] leading-none font-bold tracking-[-.02em]">
          Ce qui est annoncé
        </h2>
        <p className="mt-2 text-sm font-medium text-encre/60">
          C&apos;est ce que les visiteurs lisent sur la page de l&apos;atelier.
        </p>
        <div className="mt-6">
          <WorkshopForm
            workshop={{
              id: atelier.id,
              title: atelier.title,
              description: atelier.description,
              startsAt: atelier.startsAt,
              endsAt: atelier.endsAt,
              location: atelier.location,
              price: atelier.price,
              deposit: atelier.deposit,
              seats: atelier.seats,
            }}
          />
        </div>
      </section>
    </div>
  );
}
