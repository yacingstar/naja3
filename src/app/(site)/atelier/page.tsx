import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { WorkshopSignupForm } from "@/components/site/WorkshopSignupForm";
import { formatDateJour, formatHeure, formatPrice } from "@/lib/format";
import { getApercuAtelier, type Workshop } from "@/lib/workshops";

// La photo de la veilleuse montrée sur cette page. Un chemin plutôt qu'un
// import : elle est dans public/, donc servie telle quelle par le CDN, et la
// remplacer ne demande aucune modification de code — juste écraser le fichier
// (même nom, nouveau contenu).
const PHOTO = "/atelier/veilleuse-atelier.webp";
// Les dimensions réelles du fichier, et elles doivent le rester : next/image
// s'en sert pour réserver la place avant le chargement. Un couple qui ne
// correspond plus au fichier ne casse pas l'image, mais la fait sauter au
// chargement.
const PHOTO_LARGEUR = 1198;
const PHOTO_HAUTEUR = 1311;

// Comment on règle l'acompte.
//
// Écrit ici, en clair dans le code, et pas dans un champ de l'admin : ce sont
// les canaux de la boutique, pas une propriété d'un atelier. Ils ne changent
// pas d'un atelier à l'autre, et les dupliquer dans chaque ligne de la base
// serait trois copies à corriger le jour où l'un d'eux disparaît.
//
// Le jour où les coordonnées exactes (numéro CCP, RIB) seront à donner, elles
// rejoindront ce texte — c'est le seul endroit à toucher.
const MOYENS_DE_PAIEMENT =
  "Par CCP, virement bancaire, ou au bureau d'Invent.";

// La page dépend de l'heure : elle montre « le prochain atelier », et le
// formulaire se ferme le jour venu. Prerendue et servie depuis le CDN comme
// l'accueil, donc — sans quoi chaque visiteur coûterait une fonction
// serverless, et le pic de trafic d'une annonce d'atelier est exactement le
// moment où les fonctions sont froides.
//
// 60 secondes et pas les 5 minutes de l'accueil : ici la péremption se voit.
// Un atelier qui commence dans l'heure doit voir son formulaire se fermer
// tout seul, et une minute de retard sur ce basculement est invisible, là où
// cinq se remarqueraient.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "L'atelier",
  description:
    "Un atelier pour dessiner puis imprimer en 3D sa propre veilleuse. Nombre de places limité, inscription en ligne, on vous rappelle pour confirmer.",
};

export default async function AtelierPage() {
  const apercu = await getApercuAtelier();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <p className="font-hand text-2xl text-crepuscule">
        on dessine, on imprime, on repart avec
      </p>
      <h1 className="mt-3 font-heading text-5xl leading-[.95] font-bold tracking-[-.02em] sm:text-6xl">
        L&apos;atelier.
      </h1>

      {apercu ? (
        <Contenu workshop={apercu.workshop} ouvert={apercu.ouvert} />
      ) : (
        <AucunAtelier />
      )}

      <p className="mt-12 text-center">
        <Link href="/boutique" className="text-sm underline underline-offset-4">
          Retour à la boutique
        </Link>
      </p>
    </main>
  );
}

/**
 * Le cas vide, écrit comme un état et pas comme une erreur.
 *
 * Il arrivera pour de vrai : entre deux ateliers, la page reste en ligne et
 * quelqu'un tombera dessus depuis un lien partagé. « Rien pour le moment »
 * vaut mieux qu'un formulaire devant lequel on se demande si ça marche.
 */
function AucunAtelier() {
  return (
    <div className="mt-10 rounded-[2.5rem] border-[3px] border-encre bg-blush/25 p-8 text-center sm:p-12">
      <p className="font-heading text-2xl font-semibold">
        Aucun atelier n&apos;est annoncé pour l&apos;instant.
      </p>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-encre/70">
        Le prochain sera annoncé ici. En attendant, les veilleuses se
        commandent comme d&apos;habitude.
      </p>
    </div>
  );
}

function Contenu({ workshop, ouvert }: { workshop: Workshop; ouvert: boolean }) {
  const jour = formatDateJour(workshop.startsAt);
  const debut = formatHeure(workshop.startsAt);
  // Le jour de fin n'est pas affiché séparément : un atelier qui se termine
  // après minuit est assez rare pour qu'une plage horaire sur la mauvaise date
  // soit un moindre mal, alors qu'une deuxième date complète se lirait comme
  // deux séances.
  const horaire = workshop.endsAt
    ? `de ${debut} à ${formatHeure(workshop.endsAt)}`
    : `à partir de ${debut}`;

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
      <section>
        <h2 className="font-heading text-3xl leading-tight font-semibold">
          {workshop.title}
        </h2>

        {/* Les faits, dans l'ordre où on se les demande : quand, où, combien,
            combien de places. En clair plutôt qu'en pastilles — c'est ce qu'on
            relit juste avant de s'inscrire, et ça doit se scanner. */}
        <dl className="mt-6 space-y-3 border-y-2 border-encre/12 py-6">
          <Fait libelle="Quand">
            {jour}
            <span className="block font-medium text-encre/70">{horaire}</span>
          </Fait>
          {workshop.location ? (
            <Fait libelle="Où">{workshop.location}</Fait>
          ) : null}
          <Fait libelle="Prix">
            {workshop.price === 0 ? "Gratuit" : `${formatPrice(workshop.price)} la place`}
          </Fait>
          {/* L'acompte juste sous le prix, et avant les places : c'est l'ordre
              dans lequel on se pose la question. Et il est écrit « à verser
              d'avance » plutôt que « acompte » tout court, parce que c'est la
              seule chose qu'on veut savoir en le lisant. */}
          {workshop.deposit > 0 ? (
            <Fait libelle="Acompte">
              {formatPrice(workshop.deposit)} à verser d&apos;avance
              <span className="block font-medium text-encre/70">
                {MOYENS_DE_PAIEMENT}
              </span>
            </Fait>
          ) : null}
          {workshop.seats != null ? (
            <Fait libelle="Places">
              {workshop.seats} place{workshop.seats > 1 ? "s" : ""} seulement
            </Fait>
          ) : null}
        </dl>

        {/* La liste d'attente, écrite noir sur blanc.
            Deux raisons, et la seconde est la vraie. La première : c'est
            exactement ce que la patronne veut faire des inscriptions
            supplémentaires. La seconde : le formulaire accepte PLUS de
            personnes que de places annoncées (les places ne bloquent rien, et
            c'est un choix). Sans cette phrase, la 9e personne ne sait pas si
            elle a une place, si elle est en trop, ou si le site s'est trompé —
            et c'est le genre de doute qui se règle par un appel au lieu d'un
            autre appel. */}
        {workshop.seats != null ? (
          <p className="mt-4 text-sm leading-relaxed font-medium text-encre/60">
            Si les {workshop.seats} places sont prises, les inscriptions
            suivantes sont mises en liste d&apos;attente — on vous appelle si
            une place se libère.
          </p>
        ) : null}

        {workshop.description ? (
          <TexteAtelier texte={workshop.description} className="mt-6" />
        ) : null}

        <div className="mt-8">
          {ouvert ? (
            <WorkshopSignupForm
              workshopId={workshop.id}
              dateTexte={`${jour} — ${horaire}`}
              location={workshop.location}
              deposit={workshop.deposit}
              moyensDePaiement={MOYENS_DE_PAIEMENT}
            />
          ) : (
            <div className="rounded-[2.5rem] border-[3px] border-encre/25 bg-encre/5 p-6 sm:p-8">
              <p className="font-heading text-2xl font-semibold">
                Les inscriptions sont closes.
              </p>
              <p className="mt-2.5 leading-relaxed text-encre/70">
                Cet atelier a déjà eu lieu. Le prochain sera annoncé sur cette
                page — et si vous voulez être prévenu, écrivez-nous.
              </p>
            </div>
          )}
        </div>
      </section>

      <figure className="rounded-[2.5rem] border-4 border-encre bg-blush/30 p-4 sm:p-6">
        <div className="overflow-hidden rounded-3xl bg-papier">
          <Image
            src={PHOTO}
            alt="Une veilleuse imprimée en 3D : abat-jour rose côtelé sur une base blanche arrondie"
            width={PHOTO_LARGEUR}
            height={PHOTO_HAUTEUR}
            sizes="(min-width: 1024px) 512px, 100vw"
            quality={85}
            priority
            className="h-auto w-full object-cover"
          />
        </div>
        <figcaption className="mt-4 text-sm text-encre/65">
          Ce qu&apos;on dessine puis qu&apos;on imprime pendant l&apos;atelier —
          abat-jour côtelé, base blanche.
        </figcaption>
      </figure>
    </div>
  );
}

/**
 * La description, telle que la patronne la colle depuis l'admin.
 *
 * Un seul champ libre, mais rendu comme du texte structuré plutôt que comme un
 * bloc : une ligne vide sépare deux paragraphes, et une ligne qui commence par
 * `*` ou `-` devient une puce.
 *
 * Pourquoi ce n'est pas un simple `whitespace-pre-line` : le texte qu'on écrit
 * pour annoncer un atelier a des listes (« Au programme », « Ce qui vous
 * attend »), et un astérisque affiché en début de ligne se lit comme une faute
 * de frappe, pas comme une puce.
 *
 * Pourquoi pas une bibliothèque Markdown : elle coûterait plus lourd que la
 * page entière pour deux règles, et elle accepterait des choses — liens, HTML,
 * images — qu'on ne veut pas voir arriver dans une page dont le texte vient
 * d'un champ de saisie. Ces deux règles-ci sont tout ce dont le texte a besoin,
 * et elles ne peuvent rien produire d'autre que des paragraphes et des listes.
 *
 * `\r\n` est normalisé d'abord : le champ d'administration reçoit ce que le
 * navigateur de la patronne envoie, et une ligne « * » suivie d'un retour
 * chariot se lirait comme une puce vide.
 */
function TexteAtelier({ texte, className = "" }: { texte: string; className?: string }) {
  type Bloc = { type: "p"; texte: string } | { type: "ul"; items: string[] };

  const blocs: Bloc[] = [];
  let puces: string[] = [];

  function fermerLesPuces() {
    if (puces.length > 0) blocs.push({ type: "ul", items: puces });
    puces = [];
  }

  for (const ligne of texte.replace(/\r\n?/g, "\n").split("\n")) {
    const propre = ligne.trim();

    const puce = /^[*\-•]\s*(.+)$/.exec(propre);
    if (puce) {
      puces.push(puce[1]);
      continue;
    }

    // Toute autre ligne ferme la liste en cours. C'est ce qui permet à un
    // paragraphe de suivre une liste sans que les puces d'après s'y collent.
    fermerLesPuces();
    if (propre) blocs.push({ type: "p", texte: propre });
  }
  fermerLesPuces();

  return (
    <div className={`space-y-3.5 leading-relaxed text-encre/80 ${className}`}>
      {blocs.map((bloc, i) =>
        bloc.type === "p" ? (
          <p key={i}>{bloc.texte}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-encre/35">
            {bloc.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

/**
 * Une ligne de fait : un petit libellé à gauche, la valeur à droite.
 *
 * `dt`/`dd` et pas deux `span` : c'est une liste de définitions, et un lecteur
 * d'écran doit entendre « Quand — samedi 25 octobre 2026 » plutôt que deux
 * morceaux de texte sans lien. Le libellé porte la même couleur que partout
 * dans l'admin (EnClair), pour que les deux écrans se ressemblent.
 */
function Fait({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <dt className="w-16 shrink-0 text-sm font-medium text-encre/55">{libelle}</dt>
      <dd className="min-w-0 flex-1 font-semibold">{children}</dd>
    </div>
  );
}
