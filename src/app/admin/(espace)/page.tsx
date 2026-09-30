import Link from "next/link";
import { Bloc, Carte, EnClair } from "@/components/admin/chiffres";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminProducts } from "@/lib/adminProducts";
import { getAdminStats } from "@/lib/adminStats";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import { isWhatsAppConfigured } from "@/lib/notify/whatsapp";
import { commandesEnRetard, getOrders } from "@/lib/orders";

// Cette page n'existait pas à l'origine. La connexion fait
// `router.push("/admin")` et il n'y avait aucun `page.tsx` à la racine de
// l'espace : on arrivait sur un 404 juste après avoir saisi son mot de passe.
//
// Elle répond maintenant à UNE question : qu'est-ce que je fais maintenant ?
// Avant, elle répondait aussi à « comment ça se passe » — courbe de quatorze
// jours, comparaisons au mois dernier, trois classements — et les deux se
// noyaient l'une dans l'autre. Tout l'analyse est parti sur
// `/admin/statistiques` ; ici il ne reste que ce sur quoi on peut agir, dans
// l'ordre où on le fait.

const DERNIERES = 6;

function moisCourant(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export default async function AdminAccueilPage() {
  const [commandes, produits, stats] = await Promise.all([
    getOrders(),
    getAdminProducts(),
    getAdminStats(),
  ]);

  // Déduits de `commandes` et non de `stats` : cette lecture-là est légère,
  // elle ne peut pas échouer à cause d'un chiffre, et les quatre blocs
  // ci-dessous sont la raison d'être de la page — ils ne doivent pas dépendre
  // du calcul le plus lourd.
  const nouvelles = commandes.filter((c) => c.status === "nouvelle");
  const enRetard = commandesEnRetard(commandes);
  const aEmballer = commandes.filter((c) => c.status === "confirmée");
  const enRoute = commandes.filter((c) => c.status === "expédiée");

  const encaisseMois = commandes
    .filter((c) => moisCourant(c.createdAt) && c.status === "livrée")
    .reduce((n, c) => n + c.orderTotal, 0);

  const sansCouleur = produits.filter((p) => p.colorCount === 0);
  // Lu depuis l'environnement, pas depuis un réglage en base : les cinq
  // variables WhatsApp vivent sur Netlify, à côté de celles de Telegram et de
  // Meta, et cette page ne fait que refléter ce qui est présent.
  const whatsappConfigured = isWhatsAppConfigured();

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]">
        Bonjour.
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        {commandes.length === 0
          ? "Aucune commande pour l'instant — la boutique est en ligne et prête."
          : nouvelles.length === 0
            ? "Rien à confirmer. Tout est à jour."
            : `${nouvelles.length} ${nouvelles.length === 1 ? "commande attend" : "commandes attendent"} d'être confirmée${nouvelles.length === 1 ? "" : "s"}.`}
      </p>

      {/* ── À faire ─────────────────────────────────────────────────── */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Bloc
          valeur={String(nouvelles.length)}
          libelle="À rappeler"
          detail="commandes nouvelles"
          fond="#ffd166"
          href="/admin/commandes?status=nouvelle"
        />
        {/* Le seul bloc qui mène à un tri différent : les commandes en retard
            sont les plus ANCIENNES, et la liste s'ouvre du plus récent au plus
            ancien. Sans ce renversement, elles seraient tout en bas de la
            page — donc invisibles, ce qui est exactement le problème que ce
            bloc existe pour régler. */}
        <Bloc
          valeur={String(enRetard.length)}
          libelle="En retard"
          detail="+ de 48 h sans réponse"
          fond={enRetard.length > 0 ? "#ff9ec7" : "#8ad4c1"}
          href="/admin/commandes?status=nouvelle&ordre=ancienne"
        />
        <Bloc
          valeur={String(aEmballer.length)}
          libelle="À emballer"
          detail="commandes confirmées"
          fond="#8ad4c1"
          href="/admin/commandes?status=confirm%C3%A9e"
        />
        <Bloc
          valeur={String(enRoute.length)}
          libelle="En route"
          detail="chez le livreur"
          fond="#b9a7f5"
          href="/admin/commandes?status=exp%C3%A9di%C3%A9e"
        />
      </div>

      {/* ── L'argent, en une ligne ──────────────────────────────────── */}
      {stats ? (
        <Carte titre="L'argent" className="mt-4">
          <p className="mt-3 flex flex-wrap gap-x-7 gap-y-1.5 text-[15px]">
            <EnClair libelle="Encaissé ce mois" valeur={formatPrice(stats.encaisseMois)} />
            <EnClair libelle="En attente" valeur={formatPrice(stats.enAttente)} />
            <EnClair libelle="Panier moyen" valeur={formatPrice(stats.panierMoyen)} />
            <EnClair libelle="Ce mois" valeur={`${stats.ceMois} commandes`} />
          </p>
          <p className="mt-2.5 text-[13px] font-medium text-encre/55">
            « Encaissé » ne compte que les commandes livrées. « En attente » est
            l&apos;argent des commandes confirmées ou expédiées, pas encore rentré.
          </p>
        </Carte>
      ) : (
        <p className="mt-4 rounded-[1.5rem] border-[3px] border-encre bg-[#ff9ec7] p-5 font-heading text-base">
          Les chiffres n&apos;ont pas pu être lus — réessayez dans un instant.
        </p>
      )}

      {/* Les deux défauts silencieux. Ils n'apparaissent que s'il y en a un :
          un encadré permanent se lirait comme un élément de la page. */}

      {!whatsappConfigured ? (
        <div className="mt-4 rounded-[1.5rem] border-[3px] border-encre bg-crepuscule/25 p-5">
          <p className="font-heading text-lg font-semibold">
            Notifications WhatsApp désactivées
          </p>
          <p className="mt-1 text-sm font-medium text-encre/70">
            Les commandes ne partiront pas sur WhatsApp tant que les réglages ne
            sont pas terminés. Quatre valeurs sont à renseigner côté Netlify :{" "}
            <code className="font-semibold">WHATSAPP_TOKEN</code>,{" "}
            <code className="font-semibold">WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
            <code className="font-semibold">WHATSAPP_TO</code> et{" "}
            <code className="font-semibold">WHATSAPP_TEMPLATE_NAME</code>.
          </p>
          <p className="mt-2 text-sm font-medium text-encre/60">
            Telegram continue de fonctionner en attendant.
          </p>
        </div>
      ) : null}

      {sansCouleur.length > 0 ? (
        <div className="mt-4 rounded-[1.5rem] border-[3px] border-encre bg-papier p-5">
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

      {/* ── Dernières commandes ─────────────────────────────────────── */}
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

      {/* La porte vers l'analyse, et les raccourcis. Le lien est en clair
          plutôt qu'un cinquième onglet mis en avant : y aller est un geste
          réfléchi, pas la suite naturelle de la journée. */}
      <div className="mt-10">
        <Link
          href="/admin/statistiques"
          className="inline-flex items-center gap-2 rounded-full bg-encre px-6 py-3 font-heading text-base text-papier shadow-[0_6px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
        >
          Voir toutes les statistiques →
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          href="/admin/produits/nouveau"
          className="rounded-full border-2 border-encre px-6 py-3 font-heading text-base transition hover:bg-encre hover:text-papier"
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

      <p className="mt-6 text-[13px] font-medium text-encre/55">
        Encaissé ce mois-ci : {formatPrice(encaisseMois)} — commandes livrées seulement.
      </p>
    </div>
  );
}
