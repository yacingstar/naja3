import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ENCRE, G, M, RISO, ROUGE } from "@/components/serie/style";
import { Stats } from "@/components/admin/Stats";
import { getAdminProducts } from "@/lib/adminProducts";
import { getAdminStats } from "@/lib/adminStats";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/orders";

// L'accueil de gestion, dans le registre de la série : quatre blocs d'encre
// avec le chiffre en grand, puis le registre des dernières commandes.
//
// Il répond aux trois questions qu'on se pose en ouvrant sa boutique le matin :
// y a-t-il des commandes à traiter, combien ai-je vendu, et est-ce qu'il y a
// quelque chose de cassé dans le catalogue.

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
  encre,
  href,
}: {
  valeur: string;
  libelle: string;
  detail: string;
  encre: number;
  href: string;
}) {
  const i = RISO[encre % RISO.length];
  return (
    <Link
      href={href}
      className="riso block p-4 transition-transform duration-300 hover:-translate-y-1 sm:p-5"
      style={{ background: i.fond }}
    >
      <span className={`${G} block text-[38px] leading-none font-bold tracking-[-.02em] tabular-nums`}>
        {valeur}
      </span>
      <span className={`${M} mt-2.5 block text-[11px] tracking-[.12em] uppercase`}>{libelle}</span>
      <span className={`${M} mt-1 block text-[10px] opacity-70`}>{detail}</span>
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
      <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>
        Gestion — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className={`${G} mt-2 text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]`}>
        {commandes.length === 0 ? (
          "Bonjour."
        ) : nouvelles.length === 0 ? (
          <>
            Rien <span style={{ color: ROUGE }}>en attente</span>.
          </>
        ) : (
          <>
            <span style={{ color: ROUGE }}>{nouvelles.length}</span>{" "}
            {nouvelles.length === 1 ? "commande attend" : "commandes attendent"}.
          </>
        )}
      </h1>
      <p className="mt-2 max-w-[52ch] text-[15px] opacity-75">
        {commandes.length === 0
          ? "Aucune commande pour l'instant — la boutique est en ligne et prête."
          : nouvelles.length === 0
            ? "Tout est confirmé. Il n'y a rien à faire dans l'immédiat."
            : "À confirmer avant de lancer l'impression."}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Bloc
          valeur={String(nouvelles.length)}
          libelle="À confirmer"
          detail="commandes nouvelles"
          encre={1}
          href="/admin/commandes?status=nouvelle"
        />
        <Bloc
          valeur={String(aExpedier.length)}
          libelle="À expédier"
          detail="commandes confirmées"
          encre={0}
          href="/admin/commandes?status=confirm%C3%A9e"
        />
        <Bloc
          valeur={String(duMois.length)}
          libelle="Ce mois-ci"
          detail="annulées exclues"
          encre={2}
          href="/admin/commandes"
        />
        <Bloc
          valeur={formatPrice(encaisseMois)}
          libelle="Encaissé ce mois"
          detail="commandes livrées seulement"
          encre={3}
          href="/admin/commandes?status=livr%C3%A9e"
        />
      </div>

      {/* Le seul défaut de catalogue qu'on puisse détecter d'ici sans relire
          chaque produit : un produit sans coloris ne peut pas être commandé,
          et rien ne le signale ailleurs. */}
      {sansCouleur.length > 0 ? (
        <div className="mt-6 border-l-[3px] py-1 pl-4" style={{ borderColor: ROUGE }}>
          <p className={`${G} text-[17px] font-semibold`}>
            {sansCouleur.length === 1
              ? "Un produit n'a aucun coloris"
              : `${sansCouleur.length} produits n'ont aucun coloris`}
          </p>
          <p className="mt-1 text-[14px] opacity-75">
            Sans coloris, une veilleuse ne peut pas être commandée sur le site.
          </p>
          <p className={`${M} mt-2 flex flex-wrap gap-4 text-[11px] tracking-[.1em] uppercase`}>
            {sansCouleur.map((p) => (
              <Link key={p.id} href={`/admin/produits/${p.id}`} className="underline underline-offset-4">
                {p.name}
              </Link>
            ))}
          </p>
        </div>
      ) : null}

      <div className="mt-12 flex items-baseline justify-between gap-4 border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
        <h2 className={`${G} text-[24px] font-bold tracking-[-.02em]`}>Dernières commandes</h2>
        <Link
          href="/admin/commandes"
          className={`${M} text-[11px] tracking-[.12em] uppercase underline underline-offset-4 opacity-70 transition hover:opacity-100`}
        >
          Voir tout
        </Link>
      </div>

      {commandes.length === 0 ? (
        <p className="mt-4 opacity-60">Rien pour le moment.</p>
      ) : (
        <ul className="mt-2">
          {commandes.slice(0, DERNIERES).map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/commandes/${c.id}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b py-3.5 transition-colors hover:bg-[#1d1a17]/[.04]"
                style={{ borderColor: `${ENCRE}26` }}
              >
                <span className={`${M} w-10 shrink-0 text-[11px]`} style={{ color: ROUGE }}>
                  #{c.id}
                </span>
                <span className={`${G} min-w-0 flex-1 truncate text-[16px] font-semibold`}>
                  {c.customerFirstName} {c.customerLastName}
                  <span className={`${M} ml-2 text-[11px] font-normal opacity-60`}>{c.wilaya}</span>
                </span>
                <StatusBadge status={c.status} />
                <span className={`${G} w-[92px] shrink-0 text-right text-[16px] font-semibold tabular-nums`}>
                  {formatPrice(c.orderTotal)}
                </span>
                <time dateTime={c.createdAt} className={`${M} w-full text-[10px] opacity-50 sm:w-auto`}>
                  {formatDateTimeShort(c.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Stats stats={stats} />

      <div className={`${M} mt-12 flex flex-wrap gap-x-7 gap-y-3 text-[11px] tracking-[.12em] uppercase`}>
        <Link
          href="/admin/produits/nouveau"
          className="px-5 py-3 text-[#f6efe1] transition hover:opacity-90"
          style={{ background: ENCRE }}
        >
          Nouveau produit
        </Link>
        <Link href="/admin/produits" className="self-center underline underline-offset-4">
          Les {produits.length} veilleuses
        </Link>
        <Link href="/admin/livraison" className="self-center underline underline-offset-4">
          Tarifs de livraison
        </Link>
      </div>
    </div>
  );
}
