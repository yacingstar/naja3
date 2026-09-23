import { formatPrice } from "@/lib/format";
import type { StatsAdmin } from "@/lib/adminStats";

// Les chiffres au-delà des quatre blocs : la courbe des quatorze derniers
// jours, les comparaisons avec le mois dernier, et ce qui se vend.
//
// Aucune bibliothèque de graphiques : quatorze barres, c'est quatorze divs.
// Importer un moteur de graphiques pour ça coûterait plus lourd que toute la
// page d'accueil de gestion.
const FONDS = ["#ffd166", "#8ad4c1", "#ff9ec7", "#b9a7f5", "#7fd4ee", "#ffb38a"];

function Evolution({ valeur, precedent }: { valeur: number; precedent: number }) {
  // Sans mois de référence, un pourcentage n'a aucun sens — on l'écrit.
  if (precedent === 0) {
    return (
      <span className="text-[13px] font-medium text-encre/55">
        {valeur > 0 ? "premier mois" : "—"}
      </span>
    );
  }
  const pct = Math.round(((valeur - precedent) / precedent) * 100);
  const hausse = pct >= 0;
  return (
    <span
      className="inline-block rounded-full border-2 border-encre px-2.5 py-0.5 text-[13px] font-semibold"
      style={{ background: hausse ? "#8ad4c1" : "#ff9ec7" }}
    >
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
      <p className="text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">{titre}</p>
      {lignes.length === 0 ? (
        <p className="mt-2 text-sm text-encre/55">Pas encore de données.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {lignes.map((l, i) => (
            <li key={l.nom}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-heading text-[17px] font-semibold">
                  {l.nom}
                </span>
                <span className="shrink-0 text-[13px] font-medium text-encre/65">
                  {l.n} {unite}
                </span>
              </span>
              {/* La barre dit le rapport entre les lignes, que le chiffre seul
                  ne donne pas : 12 et 11 se lisent comme 12 et 2 sinon. */}
              <span
                aria-hidden
                className="mt-1 block h-2 rounded-full border border-encre/15"
                style={{ width: `${(l.n / max) * 100}%`, background: FONDS[i % FONDS.length] }}
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
      <p className="mt-10 rounded-[1.5rem] border-[3px] border-encre bg-[#ff9ec7] p-5 font-heading text-base">
        Les statistiques n&apos;ont pas pu être lues — réessayez dans un instant.
      </p>
    );
  }

  const max = Math.max(1, ...stats.quatorzeJours.map((j) => j.commandes));

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-heading text-[26px] leading-none font-bold tracking-[-.02em]">
          Les chiffres
        </h2>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium text-encre/65">
          <span>Panier moyen {formatPrice(stats.panierMoyen)}</span>
          <span>{stats.tauxAnnulation} % d&apos;annulations</span>
          <span>{stats.piecesVendues} pièces vendues</span>
        </p>
      </div>

      {/* ── Quatorze jours ──────────────────────────────────────────── */}
      <div className="mt-5 rounded-[1.75rem] border-[3px] border-encre p-5">
        <p className="text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">
          Commandes des 14 derniers jours
        </p>
        <div className="mt-4 flex h-24 items-end gap-1.5">
          {stats.quatorzeJours.map((j, i) => (
            <span
              key={j.date}
              title={`${j.date} — ${j.commandes} commande${j.commandes === 1 ? "" : "s"}`}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="font-heading text-[12px] text-encre/70">{j.commandes || ""}</span>
              <span
                className="w-full rounded-t-md border-2 border-encre/20"
                style={{
                  // Une commande doit rester visible : 6 px de plancher, sinon
                  // une journée à 1 se confond avec une journée à 0.
                  height: j.commandes ? `${Math.max(6, (j.commandes / max) * 68)}px` : "3px",
                  background: j.commandes ? FONDS[i % FONDS.length] : "rgba(36,28,33,.08)",
                }}
              />
              <span className="text-[11px] font-medium text-encre/45">{j.jour}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Le mois ─────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.75rem] border-[3px] border-encre p-5">
          <p className="text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">
            Commandes ce mois
          </p>
          <p className="mt-2 font-heading text-[36px] leading-none font-bold">{stats.ceMois}</p>
          <p className="mt-2.5">
            <Evolution valeur={stats.ceMois} precedent={stats.moisDernier} />
          </p>
        </div>
        <div className="rounded-[1.75rem] border-[3px] border-encre p-5">
          <p className="text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">
            Encaissé ce mois
          </p>
          <p className="mt-2 font-heading text-[36px] leading-none font-bold">
            {formatPrice(stats.encaisseMois)}
          </p>
          <p className="mt-2.5">
            <Evolution valeur={stats.encaisseMois} precedent={stats.encaisseMoisDernier} />
          </p>
        </div>
      </div>

      {/* ── Ce qui se vend ──────────────────────────────────────────── */}
      <div className="mt-4 grid gap-6 rounded-[1.75rem] border-[3px] border-encre p-5 sm:grid-cols-3 sm:gap-8">
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

      <p className="mt-4 max-w-[62ch] text-[13px] leading-relaxed font-medium text-encre/55">
        L&apos;argent n&apos;est compté que sur les commandes livrées — une commande
        confirmée n&apos;est pas encore encaissée. Les commandes annulées sont
        exclues partout, sauf du taux d&apos;annulation.
      </p>
    </div>
  );
}
