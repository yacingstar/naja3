"use client";

import { useState } from "react";

// Draft copy — worth a pass together before this goes live.
const FAQS = [
  {
    q: "Combien de temps pour recevoir ma commande ?",
    a: "Chaque lampe est imprimée à la commande : comptez quelques jours de fabrication avant l'expédition, puis le délai habituel de livraison dans votre wilaya.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Vous payez en espèces à la livraison, à domicile ou en point stopdesk selon votre wilaya. Aucune carte n'est demandée, aucun paiement en ligne.",
  },
  {
    q: "Puis-je changer la couleur de ma lampe après ma commande ?",
    a: "Tant que la fabrication n'a pas commencé, oui — contactez-nous rapidement après votre commande.",
  },
  {
    q: "Que faire si une couleur n'est pas disponible ?",
    a: "Les couleurs dépendent du stock de filament du moment. Une couleur indisponible réapparaît dès que le stock est renouvelé.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center font-heading text-3xl">Questions fréquentes</h2>
      <div className="mt-10 divide-y divide-encre/10 border-y border-encre/10">
        {FAQS.map((item, index) => {
          const open = openIndex === index;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-heading"
              >
                {item.q}
                <span
                  aria-hidden
                  className={`shrink-0 text-lueur transition-transform ${open ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              <div
                className="grid overflow-hidden transition-[grid-template-rows] duration-300"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <p className="min-h-0 overflow-hidden pb-5 text-sm text-encre/70">
                  {item.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
