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
      { threshold: 0.15 },
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
