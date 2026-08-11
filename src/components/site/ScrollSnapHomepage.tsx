"use client";

import { useEffect } from "react";

// Scroll-snap is homepage-only, per the brief. Toggling a class on <html>
// while this component is mounted (rather than a wrapping scroll container)
// keeps the real page/body as the scroll mechanism, so sticky positioning,
// mobile browser chrome, etc. all behave normally — and it's structurally
// impossible for this to leak onto /boutique, /commande, or any other page,
// since nothing there renders this component.
export function ScrollSnapHomepage() {
  useEffect(() => {
    document.documentElement.classList.add("snap-homepage");
    return () => {
      document.documentElement.classList.remove("snap-homepage");
    };
  }, []);

  return null;
}
