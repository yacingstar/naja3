import type { AdminProductListItem } from "@/lib/adminProducts";
import type { StatsAdmin } from "@/lib/adminStats";
import { formatPrice } from "@/lib/format";
import { Barres, Carte, EnClair, Evolution, FONDS, Mesure, Palmares } from "@/components/admin/chiffres";

// Le corps de la page Statistiques.
//
// Elle existe séparément de l'accueil pour une raison précise : un écran qui
// sert à tout ne sert à rien. L'accueil répond à « qu'est-ce que je fais
// maintenant », celle-ci à « comment ça se passe ». C'est pour ça que la
// courbe et les classements ont quitté l'accueil.

function jourLisible(iso: string): string {
  // Construite à partir des morceaux plutôt que par `new Date("2026-09-30")` :
  // cette dernière est interprétée en UTC, donc le jour peut reculer d'un cran
  // selon le fuseau du serveur. Ici le résultat est le même partout.
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function moisLisible(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-[30px] leading-none font-bold tracking-[-.02em]">
        {titre}
      </h2>
      {children}
    </section>
  );
}

export function Statistiques({
  stats,
  produits,
}: {
  stats: StatsAdmin;
  produits: AdminProductListItem[];
}) {
  // Ce qui ne s'est JAMAIS vendu. Comparé au catalogue complet, pas aux
  // commandes : c'est justement ce qui n'y apparaît pas qui est l'information.
  // Une veilleuse photographiée, mise en ligne, jamais commandée est un
  // problème de prix, de photo ou de description — et rien d'autre ne le dit.
  const jamaisCommandees = produits.filter((p) => !stats.produitsCommandes.includes(p.name));

  const colorisJamaisCommandes = produits.flatMap((p) =>
    p.colors
      .filter((c) => !stats.colorisCommandes.includes(`${p.name}::${c.colorName}`))
      .map((c) => ({ produit: p.name, coloris: c.colorName })),
  );

  const colorisEnRupture = produits.flatMap((p) => p.colors.filter((c) => !c.inStock));

  const totalCommandes = stats.domicile.commandes + stats.stopdesk.commandes;
  const part = (n: number) => (totalCommandes ? Math.round((n / totalCommandes) * 100) : 0);

  return (
    <div>
      {/* ── Le mois ─────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Carte titre="Commandes ce mois">
          <p className="mt-2 font-heading text-[36px] leading-none font-bold">{stats.ceMois}</p>
          <p className="mt-2.5">
            <Evolution valeur={stats.ceMois} precedent={stats.moisDernier} />
          </p>
        </Carte>
        <Carte titre="Encaissé ce mois">
          <p className="mt-2 font-heading text-[36px] leading-none font-bold">
            {formatPrice(stats.encaisseMois)}
          </p>
          <p className="mt-2.5">
            <Evolution valeur={stats.encaisseMois} precedent={stats.encaisseMoisDernier} />
          </p>
        </Carte>
      </div>

      <div className="mt-4">
        <Barres jours={stats.quatorzeJours} titre="Commandes des 14 derniers jours" />
      </div>

      {/* ── L'argent ────────────────────────────────────────────────── */}
      <Section titre="L'argent">
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Carte titre="En attente">
            <p className="mt-2 font-heading text-[30px] leading-none font-bold">
              {formatPrice(stats.enAttente)}
            </p>
            <p className="mt-2 text-[13px] font-medium text-encre/55">
              {stats.enAttenteNombre} commande{stats.enAttenteNombre > 1 ? "s" : ""} confirmée
              {stats.enAttenteNombre > 1 ? "s" : ""} ou expédiée{stats.enAttenteNombre > 1 ? "s" : ""} —
              pas encore encaissé
            </p>
          </Carte>
          <Carte titre="Perdu">
            <p className="mt-2 font-heading text-[30px] leading-none font-bold">
              {formatPrice(stats.perdu)}
            </p>
            <p className="mt-2 text-[13px] font-medium text-encre/55">
              commandes annulées
            </p>
          </Carte>
          <Carte titre="Panier moyen">
            <p className="mt-2 font-heading text-[30px] leading-none font-bold">
              {formatPrice(stats.panierMoyen)}
            </p>
            <p className="mt-2 text-[13px] font-medium text-encre/55">commandes livrées seulement</p>
          </Carte>
        </div>

        {/* La décomposition, parce qu'un total ne dit pas d'où vient l'argent :
            les frais de livraison sont encaissés mais ne sont pas du bénéfice,
            ils repartent chez le livreur. */}
        <Carte titre="Ce qui compose ce que tu as encaissé" className="mt-4">
          <p className="mt-3 font-heading text-[26px] leading-none font-bold">
            {formatPrice(stats.totalDepuisDebut)}
          </p>
          <p className="mt-1 text-[13px] font-medium text-encre/55">depuis l&apos;ouverture</p>
          {stats.totalDepuisDebut > 0 ? (
            <div className="mt-4 space-y-2.5">
              {[
                { nom: "Veilleuses", n: stats.partProduits },
                { nom: "Frais de livraison encaissés", n: stats.partLivraison },
              ].map((l, i) => (
                <div key={l.nom}>
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-encre/75">{l.nom}</span>
                    <span className="font-heading font-semibold">{formatPrice(l.n)}</span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 block h-2.5 rounded-full border border-encre/15"
                    style={{
                      width: `${Math.max(2, (l.n / stats.totalDepuisDebut) * 100)}%`,
                      background: FONDS[i % FONDS.length],
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium text-encre/60">
            {stats.meilleureJournee ? (
              <EnClair
                libelle="Meilleure journée"
                valeur={`${jourLisible(stats.meilleureJournee.date)} · ${formatPrice(stats.meilleureJournee.total)}`}
              />
            ) : null}
            {stats.meilleurMois ? (
              <EnClair
                libelle="Meilleur mois"
                valeur={`${moisLisible(stats.meilleurMois.mois)} · ${formatPrice(stats.meilleurMois.total)}`}
              />
            ) : null}
          </p>
        </Carte>
      </Section>

      {/* ── Tes clientes ────────────────────────────────────────────── */}
      <Section titre="Tes clientes">
        <p className="mt-2 max-w-[70ch] text-[15px] font-medium text-encre/70">
          {stats.clientes === 0
            ? "Personne n'a encore commandé."
            : `${stats.clientes} personne${stats.clientes > 1 ? "s" : ""} différente${stats.clientes > 1 ? "s" : ""} t'${stats.clientes > 1 ? "ont" : "a"} déjà commandé, et ${stats.partFideles} % de ce que tu as encaissé vient de clientes revenues plusieurs fois.`}
        </p>

        <Carte titre="Celles qui reviennent" className="mt-4">
          {stats.clientesFideles.length === 0 ? (
            <p className="mt-2 text-sm text-encre/55">
              Personne n&apos;a encore commandé deux fois.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-encre/10">
              {stats.clientesFideles.map((c) => (
                <li
                  key={c.telephone}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate font-heading text-[17px] font-semibold">
                    {c.nom}
                  </span>
                  <span className="text-[13px] font-medium text-encre/60">{c.telephone}</span>
                  <span className="rounded-full border-2 border-encre px-2.5 py-0.5 text-[13px] font-semibold">
                    {c.commandes} commandes
                  </span>
                  <span className="w-24 text-right font-heading font-semibold">
                    {formatPrice(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </Section>

      {/* ── Qualité ─────────────────────────────────────────────────── */}
      <Section titre="Qualité">
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Carte titre="Taux de livraison">
            <p className="mt-2 font-heading text-[36px] leading-none font-bold">
              {stats.tauxLivraison} %
            </p>
            <p className="mt-2 text-[13px] font-medium text-encre/55">
              sur les {stats.traitees} commandes traitées, combien ont été payées au bout
            </p>
          </Carte>
          <Carte titre="Taux d'annulation">
            <p className="mt-2 font-heading text-[36px] leading-none font-bold">
              {stats.tauxAnnulation} %
            </p>
            <p className="mt-2 text-[13px] font-medium text-encre/55">
              sur toutes les commandes reçues
            </p>
          </Carte>
          <Carte titre="Comment ça se livre">
            <p className="mt-2 space-y-1.5 text-sm font-medium">
              <span className="block">
                <EnClair
                  libelle="À domicile"
                  valeur={`${stats.domicile.commandes} (${part(stats.domicile.commandes)} %)`}
                />
              </span>
              <span className="block">
                <EnClair
                  libelle="Stopdesk"
                  valeur={`${stats.stopdesk.commandes} (${part(stats.stopdesk.commandes)} %)`}
                />
              </span>
            </p>
            <p className="mt-2.5 text-[13px] font-medium text-encre/55">
              Panier moyen {formatPrice(stats.domicile.panierMoyen)} à domicile,{" "}
              {formatPrice(stats.stopdesk.panierMoyen)} en stopdesk
            </p>
          </Carte>
        </div>

        <div className="mt-4 grid gap-6 rounded-[1.75rem] border-[3px] border-encre p-5 sm:grid-cols-2 sm:gap-8">
          <Palmares
            titre="Où ça annule le plus"
            lignes={stats.annulationsParWilaya}
            unite="annulée(s)"
          />
          <Palmares
            titre="Les wilayas qui rapportent le plus"
            lignes={stats.wilayasParArgent.map((w) => ({ nom: w.nom, n: w.n }))}
            unite="DA"
          />
        </div>
      </Section>

      {/* ── Produits ────────────────────────────────────────────────── */}
      <Section titre="Produits">
        <div className="mt-5 grid gap-6 rounded-[1.75rem] border-[3px] border-encre p-5 sm:grid-cols-3 sm:gap-8">
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

        <Carte titre="Ce qui ne s'est jamais vendu" className="mt-4">
          {jamaisCommandees.length === 0 ? (
            <p className="mt-2 text-sm text-encre/55">
              Toutes tes veilleuses ont été commandées au moins une fois.
            </p>
          ) : (
            <>
              <p className="mt-2 max-w-[70ch] text-[15px] font-medium text-encre/70">
                Jamais commandée{jamaisCommandees.length > 1 ? "s" : ""} depuis l&apos;ouverture —
                ce n&apos;est ni la faute du hasard ni celle des clientes : c&apos;est le plus
                souvent le prix, la photo ou la description.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {jamaisCommandees.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border-2 border-encre px-3.5 py-1.5 text-sm font-semibold"
                    style={{ background: FONDS[2] }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </>
          )}

          {colorisJamaisCommandes.length > 0 ? (
            <p className="mt-4 max-w-[70ch] text-[13px] font-medium text-encre/60">
              {colorisJamaisCommandes.length} coloris n&apos;ont jamais été commandés, dont{" "}
              {colorisJamaisCommandes.slice(0, 4).map((c) => `${c.produit} ${c.coloris}`).join(", ")}
              {colorisJamaisCommandes.length > 4 ? "…" : ""}
            </p>
          ) : null}

          {colorisEnRupture.length > 0 ? (
            <p className="mt-2 text-[13px] font-medium text-encre/60">
              {colorisEnRupture.length} coloris {colorisEnRupture.length > 1 ? "sont" : "est"} en
              rupture — {colorisEnRupture.length > 1 ? "ils ne peuvent pas" : "il ne peut pas"} être
              commandé{colorisEnRupture.length > 1 ? "s" : ""}.
            </p>
          ) : null}
        </Carte>

        <Carte titre="Quand on te commande" className="mt-4">
          <Palmares
            titre=""
            lignes={stats.parJourSemaine.map((j) => ({ nom: j.jour, n: j.commandes }))}
            unite="cmd"
          />
        </Carte>

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium text-encre/60">
          <EnClair libelle="Pièces vendues" valeur={String(stats.piecesVendues)} />
        </p>
      </Section>

      {/* ── Délais ──────────────────────────────────────────────────── */}
      <Section titre="Délais">
        <p className="mt-2 max-w-[70ch] text-[15px] font-medium text-encre/70">
          Le découpage compte : un retard de préparation est de ton ressort, un retard de trajet
          est celui du livreur.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Mesure
            titre="Tu confirmes en"
            delai={stats.delais.confirmation}
            quoi="Se remplira avec les prochaines commandes."
          />
          <Mesure
            titre="Préparation"
            delai={stats.delais.expedition}
            quoi="Le temps entre confirmer et expédier."
          />
          <Mesure
            titre="Trajet du livreur"
            delai={stats.delais.livraison}
            quoi="Le temps entre expédier et livrer."
          />
          <Mesure
            titre="En tout pour la cliente"
            delai={stats.delais.total}
            quoi="De la commande à la livraison."
          />
        </div>
      </Section>

      <p className="mt-10 max-w-[62ch] text-[13px] leading-relaxed font-medium text-encre/55">
        L&apos;argent n&apos;est compté que sur les commandes livrées — une commande confirmée
        n&apos;est pas encore encaissée. Les commandes annulées sont exclues partout, sauf du taux
        d&apos;annulation et de leur propre classement. Les clientes sont regroupées par numéro de
        téléphone.
      </p>
    </div>
  );
}
