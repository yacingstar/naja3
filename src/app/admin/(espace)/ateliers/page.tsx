import Link from "next/link";

import { Carte } from "@/components/admin/chiffres";
import { getAdminWorkshops } from "@/lib/adminWorkshops";
import { formatDateAtelier, formatPrice } from "@/lib/format";

// La liste des ateliers. Elle répond à une seule question : est-ce que
// quelqu'un s'inscrit, et faut-il que j'appelle ?
//
// Le nombre d'inscrits est la raison d'être de cette page, donc il est écrit
// en gros et pas en petit — c'est le seul chiffre qu'on vient chercher ici.
export default async function AdminAteliersPage() {
  const ateliers = await getAdminWorkshops();

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[48px]">
        Ateliers
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        {ateliers.length === 0
          ? "Aucun atelier pour l'instant."
          : "Ce que les gens voient sur le site, et qui s'est inscrit."}
      </p>

      <div className="mt-6">
        <Link
          href="/admin/ateliers/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-encre px-6 py-3 font-heading text-base text-papier shadow-[0_6px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
        >
          Nouvel atelier →
        </Link>
      </div>

      {ateliers.length === 0 ? (
        <div className="mt-8">
          <Carte>
            <p className="font-heading text-xl font-semibold">
              Rien d&apos;annoncé.
            </p>
            <p className="mt-1.5 text-sm font-medium text-encre/65">
              Tant qu&apos;aucun atelier n&apos;existe, la page{" "}
              <Link href="/atelier" className="underline underline-offset-4">
                /atelier
              </Link>{" "}
              affiche « aucun atelier annoncé » — c&apos;est prévu, et ça ne
              casse rien.
            </p>
          </Carte>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {ateliers.map((a) => {
            // `>=` et pas `>` : à douze inscrits pour douze places, l'atelier
            // est plein, et c'est l'information qu'on veut voir. Le `>=` ne
            // bloque rien (les places sont une annonce), il colore.
            const complet = a.seats != null && a.inscrits >= a.seats;
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/ateliers/${a.id}`}
                  className="block rounded-2xl border-2 border-encre/12 px-4 py-4 transition hover:border-encre/40 hover:bg-encre/[.03]"
                >
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="min-w-0 flex-1 font-heading text-lg font-semibold">
                      {a.title}
                    </span>
                    <span
                      className={`inline-block rounded-full border-2 px-3 py-0.5 text-xs font-semibold ${
                        a.aVenir
                          ? "border-encre bg-[#8ad4c1] text-encre"
                          : "border-encre/25 bg-papier text-encre/50"
                      }`}
                    >
                      {a.aVenir ? "à venir" : "passé"}
                    </span>
                  </span>

                  <span className="mt-1.5 block text-sm font-medium text-encre/70">
                    {formatDateAtelier(a.startsAt)}
                    {a.location ? (
                      <span className="text-encre/55"> · {a.location}</span>
                    ) : null}
                    <span className="text-encre/55"> · {formatPrice(a.price)}</span>
                  </span>

                  <span className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span
                      className={`font-heading text-base font-semibold ${
                        complet ? "text-red-700" : "text-encre"
                      }`}
                    >
                      {a.inscrits} inscrit{a.inscrits > 1 ? "s" : ""}
                      {a.seats != null ? (
                        <span className="font-medium text-encre/50">
                          {" "}
                          / {a.seats} place{a.seats > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </span>
                    {/* Les annulations ne comptent pas dans les inscrits, donc
                        elles ne peuvent pas se déduire du chiffre d'à côté :
                        sans cette mention, une vague d'annulations serait
                        invisible. */}
                    {a.annules > 0 ? (
                      <span className="text-[13px] font-medium text-encre/50">
                        {a.annules} annulé{a.annules > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
