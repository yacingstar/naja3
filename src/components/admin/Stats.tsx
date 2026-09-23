import { ENCRE, G, M, RISO, ROUGE } from "@/components/serie/style";
import { formatPrice } from "@/lib/format";
import type { StatsAdmin } from "@/lib/adminStats";

// Les chiffres au-delà des quatre blocs : la courbe des quatorze derniers
// jours, les comparaisons avec le mois dernier, et ce qui se vend.
//
// Aucune bibliothèque de graphiques : quatorze barres, c'est quatorze divs.
// Importer un moteur de graphiques pour ça coûterait plus lourd que toute la
// page d'accueil de gestion.

function Evolution({ valeur, precedent }: { valeur: number; precedent: number }) {
  // Sans mois de référence, un pourcentage n'a aucun sens — on l'écrit.
  if (precedent === 0) {
    return <span className={`${M} text-[10px] opacity-60`}>{valeur > 0 ? "premier mois" : "—"}</span>;
  }
  const pct = Math.round(((valeur - precedent) / precedent) * 100);
  const hausse = pct >= 0;
  return (
    <span className={`${M} text-[10px]`} style={{ color: hausse ? "#4f7a2c" : ROUGE }}>
      {hausse ? "▲" : "▼"} {Math.abs(pct)} % vs mois dernier
    </span>
  );
}

function Palmares({
  titre,
  lignes,
  unite,
}: {
  titre: string;
  lignes: Array<{ nom: string; n: number }>;
  unite: string;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return (
    <div>
      <p className={`${M} text-[10px] tracking-[.14em] uppercase opacity-60`}>{titre}</p>
      {lignes.length === 0 ? (
        <p className="mt-2 text-[13px] opacity-55">Pas encore de données.</p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {lignes.map((l, i) => (
            <li key={l.nom}>
              <span className="flex items-baseline justify-between gap-3">
                <span className={`${G} min-w-0 truncate text-[15px] font-semibold`}>{l.nom}</span>
                <span className={`${M} shrink-0 text-[11px] opacity-70`}>
                  {l.n} {unite}
                </span>
              </span>
              {/* La barre dit le rapport entre les lignes, que le chiffre seul
                  ne donne pas : 12 et 11 se lisent comme 12 et 2 sinon. */}
              <span
                aria-hidden
                className="mt-1 block h-1"
                style={{ width: `${(l.n / max) * 100}%`, background: RISO[i % RISO.length].fond }}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Stats({ stats }: { stats: StatsAdmin | null }) {
  if (!stats) {
    return (
      <p className={`${M} mt-8 text-[11px] tracking-[.1em] uppercase`} style={{ color: ROUGE }}>
        Les statistiques n&apos;ont pas pu être lues — réessayez dans un instant.
      </p>
    );
  }

  const max = Math.max(1, ...stats.quatorzeJours.map((j) => j.commandes));

  return (
    <div className="mt-12 border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className={`${G} text-[24px] font-bold tracking-[-.02em]`}>Les chiffres</h2>
        <p className={`${M} flex flex-wrap gap-x-6 gap-y-1 text-[10px] tracking-[.1em] uppercase opacity-70`}>
          <span>Panier moyen {formatPrice(stats.panierMoyen)}</span>
          <span>{stats.tauxAnnulation} % d&apos;annulations</span>
          <span>{stats.piecesVendues} pièces vendues</span>
        </p>
      </div>

      {/* ── Quatorze jours ──────────────────────────────────────────── */}
      <div className="mt-6">
        <p className={`${M} text-[10px] tracking-[.14em] uppercase opacity-60`}>
          Commandes des 14 derniers jours
        </p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {stats.quatorzeJours.map((j, i) => (
            <span
              key={j.date}
              title={`${j.date} — ${j.commandes} commande${j.commandes === 1 ? "" : "s"}`}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className={`${M} text-[9px] opacity-60`}>{j.commandes || ""}</span>
              <span
                className="w-full"
                style={{
                  // Une commande doit rester visible : 4 px de plancher, sinon
                  // une journée à 1 se confond avec une journée à 0.
                  height: j.commandes ? `${Math.max(4, (j.commandes / max) * 72)}px` : "2px",
                  background: j.commandes ? RISO[i % RISO.length].fond : `${ENCRE}1f`,
                }}
              />
              <span className={`${M} text-[9px] opacity-45`}>{j.jour}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Le mois ─────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className={`${M} text-[10px] tracking-[.14em] uppercase opacity-60`}>Commandes ce mois</p>
          <p className={`${G} mt-1 text-[30px] leading-none font-bold tabular-nums`}>{stats.ceMois}</p>
          <p className="mt-1">
            <Evolution valeur={stats.ceMois} precedent={stats.moisDernier} />
          </p>
        </div>
        <div>
          <p className={`${M} text-[10px] tracking-[.14em] uppercase opacity-60`}>Encaissé ce mois</p>
          <p className={`${G} mt-1 text-[30px] leading-none font-bold tabular-nums`}>
            {formatPrice(stats.encaisseMois)}
          </p>
          <p className="mt-1">
            <Evolution valeur={stats.encaisseMois} precedent={stats.encaisseMoisDernier} />
          </p>
        </div>
      </div>

      {/* ── Ce qui se vend ──────────────────────────────────────────── */}
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        <Palmares
          titre="Formes les plus commandées"
          lignes={stats.formes.map((f) => ({ nom: f.nom, n: f.quantite }))}
          unite="pièces"
        />
        <Palmares
          titre="Coloris les plus commandés"
          lignes={stats.coloris.map((c) => ({ nom: c.nom, n: c.quantite }))}
          unite="pièces"
        />
        <Palmares
          titre="Wilayas"
          lignes={stats.wilayas.map((w) => ({ nom: w.nom, n: w.commandes }))}
          unite="cmd"
        />
      </div>

      <p className={`${M} mt-8 max-w-[62ch] text-[10px] leading-relaxed tracking-[.05em] opacity-55`}>
        L&apos;argent n&apos;est compté que sur les commandes livrées — une commande
        confirmée n&apos;est pas encore encaissée. Les commandes annulées sont
        exclues partout, sauf du taux d&apos;annulation.
      </p>
    </div>
  );
}
