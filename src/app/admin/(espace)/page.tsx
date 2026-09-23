import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Stats } from "@/components/admin/Stats";
import { getAdminProducts } from "@/lib/adminProducts";
import { getAdminStats } from "@/lib/adminStats";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/orders";

// Cette page n'existait pas. La connexion fait `router.push("/admin")` et il
// n'y avait aucun `page.tsx` à la racine de l'espace : on arrivait sur un 404
// juste après avoir saisi son mot de passe, et il fallait deviner qu'il
// fallait cliquer sur « Commandes ».
//
// Elle répond aux trois questions qu'on se pose en ouvrant sa boutique le
// matin : y a-t-il des commandes à traiter, combien ai-je vendu, et est-ce
// qu'il y a quelque chose de cassé dans le catalogue.

// Les chiffres sont calculés sur la liste complète des commandes. C'est
// volontairement naïf : la boutique en compte quelques centaines, et une
// requête d'agrégat par carte coûterait plus cher que ce seul appel. À revoir
// le jour où la liste passe le millier.
const DERNIERES = 6;

function moisCourant(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function Bloc({
  valeur,
  libelle,
  detail,
  fond,
  href,
}: {
  valeur: string;
  libelle: string;
  detail?: string;
  fond: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[1.75rem] border-[3px] border-encre p-5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(36,28,33,.6)]"
      style={{ background: fond }}
    >
      <span className="block font-heading text-[40px] leading-none font-bold text-encre">
        {valeur}
      </span>
      <span className="mt-1.5 block font-heading text-[15px] font-semibold text-encre">
        {libelle}
      </span>
      {detail ? (
        <span className="mt-0.5 block text-[13px] font-medium text-encre/65">{detail}</span>
      ) : null}
    </Link>
  );
}

export default async function AdminAccueilPage() {
  const [commandes, produits, stats] = await Promise.all([
    getOrders(),
    getAdminProducts(),
    getAdminStats(),
  ]);

  const nouvelles = commandes.filter((c) => c.status === "nouvelle");
  const aExpedier = commandes.filter((c) => c.status === "confirmée");
  const duMois = commandes.filter((c) => moisCourant(c.createdAt) && c.status !== "annulée");
  const encaisseMois = commandes
    .filter((c) => moisCourant(c.createdAt) && c.status === "livrée")
    .reduce((n, c) => n + c.orderTotal, 0);

  const sansCouleur = produits.filter((p) => p.colorCount === 0);

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]">
        Bonjour.
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        {commandes.length === 0
          ? "Aucune commande pour l'instant — la boutique est en ligne et prête."
          : nouvelles.length === 0
            ? "Rien de nouveau à traiter. Tout est à jour."
            : `${nouvelles.length} ${nouvelles.length === 1 ? "commande attend" : "commandes attendent"} d'être confirmée${nouvelles.length === 1 ? "" : "s"}.`}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Bloc
          valeur={String(nouvelles.length)}
          libelle="À confirmer"
          detail="commandes nouvelles"
          fond="#ffd166"
          href="/admin/commandes?status=nouvelle"
        />
        <Bloc
          valeur={String(aExpedier.length)}
          libelle="À expédier"
          detail="commandes confirmées"
          fond="#8ad4c1"
          href="/admin/commandes?status=confirm%C3%A9e"
        />
        <Bloc
          valeur={String(duMois.length)}
          libelle="Ce mois-ci"
          detail="commandes, annulées exclues"
          fond="#ff9ec7"
          href="/admin/commandes"
        />
        <Bloc
          valeur={formatPrice(encaisseMois)}
          libelle="Encaissé ce mois"
          detail="commandes livrées seulement"
          fond="#b9a7f5"
          href="/admin/commandes?status=livr%C3%A9e"
        />
      </div>

      {/* Le seul défaut de catalogue qu'on puisse détecter d'ici sans relire
          chaque produit : un produit sans coloris ne peut pas être commandé,
          et rien ne le signale ailleurs. */}
      {sansCouleur.length > 0 ? (
        <div className="mt-5 rounded-[1.5rem] border-[3px] border-encre bg-papier p-5">
          <p className="font-heading text-lg font-semibold">
            {sansCouleur.length === 1
              ? "Un produit n'a aucun coloris"
              : `${sansCouleur.length} produits n'ont aucun coloris`}
          </p>
          <p className="mt-1 text-sm font-medium text-encre/70">
            Sans coloris, une veilleuse ne peut pas être commandée sur le site.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sansCouleur.map((p) => (
              <Link
                key={p.id}
                href={`/admin/produits/${p.id}`}
                className="rounded-full border-2 border-encre px-3.5 py-1.5 text-sm font-semibold transition hover:bg-encre hover:text-papier"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-[26px] leading-none font-bold tracking-[-.02em]">
          Dernières commandes
        </h2>
        <Link
          href="/admin/commandes"
          className="text-sm font-semibold text-encre/60 underline transition hover:text-encre"
        >
          Voir tout
        </Link>
      </div>

      {commandes.length === 0 ? (
        <p className="mt-4 text-encre/60">Rien pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {commandes.slice(0, DERNIERES).map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/commandes/${c.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border-2 border-encre/12 px-4 py-3 transition hover:border-encre/40 hover:bg-encre/[.03]"
              >
                <span className="font-heading text-base font-semibold">#{c.id}</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {c.customerFirstName} {c.customerLastName}
                  <span className="text-encre/55"> · {c.wilaya}</span>
                </span>
                <span className="font-heading text-base">{formatPrice(c.orderTotal)}</span>
                <StatusBadge status={c.status} />
                <time
                  dateTime={c.createdAt}
                  className="w-full text-[13px] font-medium text-encre/50 sm:w-auto"
                >
                  {formatDateTimeShort(c.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Stats stats={stats} />

      <div className="mt-12 flex flex-wrap gap-2.5">
        <Link
          href="/admin/produits/nouveau"
          className="rounded-full bg-encre px-6 py-3 font-heading text-base text-papier shadow-[0_6px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
        >
          Nouveau produit
        </Link>
        <Link
          href="/admin/produits"
          className="rounded-full border-2 border-encre px-6 py-3 font-heading text-base transition hover:bg-encre hover:text-papier"
        >
          Les {produits.length} veilleuses
        </Link>
        <Link
          href="/admin/livraison"
          className="rounded-full border-2 border-encre px-6 py-3 font-heading text-base transition hover:bg-encre hover:text-papier"
        >
          Tarifs de livraison
        </Link>
      </div>
    </div>
  );
}
