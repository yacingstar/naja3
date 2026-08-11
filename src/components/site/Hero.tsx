export function Hero() {
  return (
    <section className="snap-section relative overflow-hidden px-6 pt-32 pb-24 text-center sm:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-lueur/40 blur-3xl"
      />
      <p className="relative font-hand text-2xl text-crepuscule">
        fait main, à la commande
      </p>
      <h1 className="relative mt-3 font-heading text-5xl leading-tight sm:text-6xl">
        Une lumière chaude,
        <br />
        posée chez vous.
      </h1>
      <p className="relative mx-auto mt-6 max-w-md text-encre/70">
        Des lampes imprimées en 3D, fabriquées à la commande en Algérie.
        Paiement à la livraison, partout au pays.
      </p>
      <a
        href="#creations"
        className="relative mt-10 inline-block rounded-full bg-lueur px-8 py-3 font-medium text-encre transition hover:bg-lueur/90"
      >
        Découvrir la collection
      </a>
    </section>
  );
}
