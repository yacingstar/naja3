"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-triggered fade/slide-in. No animation library — an IntersectionObserver
// toggling a data attribute, with the actual animation living in CSS
// (.reveal in globals.css) so prefers-reduced-motion can neutralize it in
// one place. Fires once: reveals when it first enters the viewport, then
// disconnects rather than re-animating on every scroll past.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // `threshold: 0`, jamais un pourcentage — et c'est le cœur du composant.
      //
      // Le rapport d'intersection vaut au mieux (hauteur d'écran / hauteur du
      // bloc). Un seuil de 0,15 n'est donc ATTEIGNABLE que pour un bloc plus
      // court que ~6,7 écrans ; au-delà, l'observateur ne se déclenche jamais
      // et le bloc reste à `opacity: 0` POUR TOUJOURS. Le contenu est bien
      // dans la page, il n'est simplement jamais montré.
      //
      // C'est arrivé sur un téléphone, et seulement là : l'écran y est court
      // (barre d'adresse comprise) pendant que les sections sont longues. La
      // FAQ et les étapes de fabrication dépassent le rapport, l'ordinateur
      // non — d'où un bug qu'on ne voit qu'en regardant depuis un mobile.
      //
      // Avec un seuil nul, le bloc apparaît dès qu'il commence à entrer. La
      // marge négative en bas ne fait que retarder le déclenchement de 12 % de
      // l'écran, pour que le mouvement soit fini avant d'être lu — c'est du
      // confort, pas une condition d'apparition. C'est le même choix que
      // `useReveal` : dans le pire des cas le contenu apparaît trop tôt, jamais
      // pas du tout.
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={visible ? "visible" : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}
