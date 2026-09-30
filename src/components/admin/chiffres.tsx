import Link from "next/link";
import type { Delai, JourVente } from "@/lib/adminStats";

// Les briques d'affichage des deux écrans de chiffres : l'accueil et la page
// Statistiques.
//
// Extraites ici parce que les deux pages montrent les mêmes choses — un grand
// nombre, une comparaison au mois dernier, un classement en barres, une
// courbe — et qu'une deuxième copie de chacune divergerait à la première
// retouche. Une seule définition, deux usages.
//
// Aucune bibliothèque de graphiques, et c'est un choix déjà pris et documenté
// sur l'accueil : quatorze barres, c'est quatorze divs. Importer un moteur de
// graphiques coûterait plus lourd que la page entière.

export const FONDS = ["#ffd166", "#8ad4c1", "#ff9ec7", "#b9a7f5", "#7fd4ee", "#ffb38a"];

export function Carte({
  titre,
  children,
  className = "",
}: {
  titre?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.75rem] border-[3px] border-encre p-5 ${className}`}>
      {titre ? (
        <p className="text-[13px] font-semibold tracking-[.06em] text-encre/60 uppercase">{titre}</p>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Un grand nombre dans un bloc de couleur, cliquable.
 *
 * Le détail est ce qui rend le chiffre utilisable : « 3 » seul ne dit pas s'il
 * s'agit de trois commandes ou de trois jours.
 */
export function Bloc({
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

/**
 * Comparaison au mois dernier.
 *
 * Sans mois de référence, un pourcentage n'a aucun sens — on l'écrit plutôt
 * que d'afficher « +100 % » sur un premier mois.
 */
export function Evolution({ valeur, precedent }: { valeur: number; precedent: number }) {
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

/** Un classement, avec la barre qui dit le rapport entre les lignes. */
export function Palmares({
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

/**
 * La courbe des quatorze derniers jours.
 *
 * Un jour sans commande garde une barre de 3 px au lieu de disparaître : la
 * case vide est l'information, la sauter donnerait une courbe qui ment.
 */
export function Barres({ jours, titre }: { jours: JourVente[]; titre: string }) {
  const max = Math.max(1, ...jours.map((j) => j.commandes));
  return (
    <Carte titre={titre}>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {jours.map((j, i) => (
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
    </Carte>
  );
}

/**
 * Une mesure de durée, avec son échantillon.
 *
 * Le « sur N commandes » n'est pas une précaution de style : les délais ne
 * peuvent être calculés que sur les commandes passées après la migration qui a
 * ajouté les dates. Sans ce décompte, « 2,4 jours » se lirait comme une
 * moyenne sur toute l'histoire de la boutique.
 */
export function Mesure({
  titre,
  delai,
  quoi,
}: {
  titre: string;
  delai: Delai;
  quoi: string;
}) {
  const mesure = delai.sur > 0;
  return (
    <Carte titre={titre}>
      {mesure ? (
        <>
          <p className="mt-2 font-heading text-[34px] leading-none font-bold">
            {delai.jours.toLocaleString("fr-FR")}
            <span className="ml-1.5 font-heading text-[16px] font-semibold text-encre/60">
              jour{delai.jours > 1 ? "s" : ""}
            </span>
          </p>
          <p className="mt-2 text-[13px] font-medium text-encre/55">
            sur {delai.sur} commande{delai.sur > 1 ? "s" : ""} mesurée{delai.sur > 1 ? "s" : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-heading text-[22px] leading-tight font-bold text-encre/45">
            Pas encore mesuré
          </p>
          <p className="mt-2 text-[13px] font-medium text-encre/55">{quoi}</p>
        </>
      )}
    </Carte>
  );
}

/** Un chiffre et son libellé, pour les lignes compactes (« En attente 8 900 DA »). */
export function EnClair({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-encre/60">{libelle}</span>
      <span className="font-heading font-semibold text-encre">{valeur}</span>
    </span>
  );
}
