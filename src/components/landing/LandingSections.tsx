import { Fragment } from "react";
import { instagramUrl } from "@/lib/contact";

// The parts of a landing page that are the same for every lamp: the ticker,
// the three promises, the four fabrication steps, the questions, the footer.
//
// Split out of ProductLanding purely so that file stays about the one thing
// it actually does — hold the selected colour and the on/off state and wire
// the cart. Nothing here has state or props; it is markup.

const TICKER = [
  "Paiement à la livraison",
  "58 wilayas",
  "Imprimée en 3D en Algérie",
  "Aucune carte demandée",
  "Emballée à la main",
];

function TickerRun({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="lp-ticker-run" aria-hidden={hidden || undefined}>
      {TICKER.map((item) => (
        <Fragment key={item}>
          <span>{item}</span>
          {/* Decorative punctuation, not content — a screen reader
              announcing "black square" five times is noise. */}
          <span aria-hidden>▪</span>
        </Fragment>
      ))}
    </div>
  );
}

export function LandingTicker() {
  return (
    <div className="lp-ticker">
      <div className="lp-ticker-track">
        <TickerRun />
        {/* The duplicate is what makes the loop seamless — see landing.css. */}
        <TickerRun hidden />
      </div>
    </div>
  );
}

const PROMISES = [
  {
    kicker: "Aucune série",
    title: "La vôtre n'existe pas encore",
    body: "Elle est imprimée après votre commande, pièce par pièce. Rien ne dort dans un carton en attendant un acheteur.",
  },
  {
    kicker: "Petit grain",
    title: "Un caractère à elle",
    body: "Les couches se voient un peu, et c'est voulu. Deux lampes ne sont jamais tout à fait identiques.",
  },
  {
    kicker: "Zéro risque",
    title: "Vous payez en la recevant",
    body: "En espèces, à domicile ou en stopdesk. Aucune carte, aucun paiement en ligne, dans les 58 wilayas.",
  },
];

export function LandingPromises() {
  return (
    <section className="lp-band">
      <div className="lp-cols">
        {PROMISES.map((promise) => (
          <div key={promise.kicker} className="lp-cell">
            <span className="lp-kicker">{promise.kicker}</span>
            <h2 className="lp-h3">{promise.title}</h2>
            <p className="lp-body">{promise.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Same four steps as the homepage's "Comment c'est fait" (CraftSteps.tsx),
// told in one line each rather than with the illustrations — this page is
// type, not drawings.
const STEPS = [
  {
    n: "01",
    title: "Le dessin",
    body: "Chaque modèle est dessiné et modélisé en 3D avant d'exister.",
  },
  {
    n: "02",
    title: "L'impression",
    body: "Imprimée couche par couche, plusieurs heures par lampe.",
  },
  {
    n: "03",
    title: "Les finitions",
    body: "Assemblée, câblée et vérifiée à la main, une par une.",
  },
  {
    n: "04",
    title: "L'emballage",
    body: "Emballée avec soin et envoyée chez vous.",
  },
];

export function LandingFabrication() {
  return (
    <section id="fabrication" className="lp-band">
      <div className="lp-section-head">
        <span className="lp-kicker">Comment c&apos;est fait</span>
        <h2 className="lp-title lp-title-wrap">
          Quatre étapes, aucune chaîne de montage
        </h2>
      </div>
      <div className="lp-cols lp-cols-steps">
        {STEPS.map((step) => (
          <div key={step.n} className="lp-step">
            <p className="lp-step-num">{step.n}</p>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const QUESTIONS = [
  {
    q: "Combien de temps pour recevoir ma commande ?",
    a: "Chaque lampe est imprimée à la commande : comptez quelques jours de fabrication avant l'expédition, puis le délai habituel de livraison dans votre wilaya.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Vous payez en espèces à la livraison, à domicile ou en point stopdesk selon votre wilaya. Aucune carte n'est demandée, aucun paiement en ligne.",
  },
  {
    q: "Puis-je changer la couleur après ma commande ?",
    a: "Tant que la fabrication n'a pas commencé, oui — contactez-nous rapidement après votre commande.",
  },
  {
    q: "Que faire si une couleur n'est pas disponible ?",
    a: "Les couleurs dépendent du stock de filament du moment. Une couleur indisponible réapparaît dès que le stock est renouvelé.",
  },
];

export function LandingFaq() {
  return (
    <section id="questions" className="lp-band">
      <div className="lp-cols lp-cols-faq">
        <div className="lp-faq-side">
          <span className="lp-kicker">Questions fréquentes</span>
          <h2 className="lp-title lp-title-sm">Avant de commander</h2>
          {/* Only offered when a channel is actually configured — see
              lib/contact.ts. A dead link here is worse than no link. */}
          {instagramUrl ? (
            <p>
              Une autre question ? Écrivez-nous sur{" "}
              <a href={instagramUrl} target="_blank" rel="noreferrer">
                Instagram
              </a>
              , on répond vite.
            </p>
          ) : null}
        </div>
        <div className="lp-faq-list">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <span>© {new Date().getFullYear()} Naja — fait avec amour en Algérie.</span>
      <span>Paiement à la livraison · 58 wilayas</span>
    </footer>
  );
}
