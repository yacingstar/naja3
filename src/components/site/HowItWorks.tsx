const STEPS = [
  {
    title: "Choisissez un modèle",
    text: "Parcourez la collection et trouvez la lampe qui vous ressemble.",
  },
  {
    title: "Choisissez une couleur",
    text: "Chaque modèle existe en plusieurs teintes, selon le stock de filament du moment.",
  },
  {
    title: "Commandez, paiement à la livraison",
    text: "Aucune carte, aucun compte à créer — vous payez en espèces à la réception.",
  },
  {
    title: "Réception",
    text: "Votre lampe est imprimée puis livrée directement chez vous, ou en stopdesk.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="bg-blush/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl">Comment ça marche</h2>
        <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-lueur font-heading text-encre">
                {index + 1}
              </span>
              <h3 className="mt-4 font-heading text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-encre/70">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
