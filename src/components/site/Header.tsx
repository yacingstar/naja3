"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartLink } from "@/components/site/CartLink";
import { InstagramIcon } from "@/components/site/Icons";
import { instagramUrl } from "@/lib/contact";

// "Comment ça marche"/FAQ are homepage sections, so they're homepage-relative
// hashes (works whether you're already on / or coming from elsewhere).
//
// Always transparent now, on every page — no more solid-on-scroll swap
// (previously `bg-papier/90 backdrop-blur` past a scroll threshold). Each
// nav item carries its own background pill instead (see the nav/cart/CTA
// classes below), so legibility no longer depends on the bar itself having
// a solid backing — same treatment works over the colorful hero, a plain
// papier page, or a product photo on the detail page.
//
// Only the wordmark reacts to scroll: it eases up and shrinks slightly
// (`scrolled` below) while the nav/cart/CTA row stays put — asked to keep
// the buttons steady and have "the company name" be the thing that moves.
// Still a CSS `transform`, never padding/font-size — changing a
// layout-affecting property here previously shrank the header's actual box
// height while scrolling, and on the homepage that fed back into
// scroll-snap-type's max-scroll calculation and permanently trapped
// scrolling partway down the page (confirmed: freezing the header's
// padding fixed it immediately). transform doesn't affect layout, so it
// avoids the whole class of bug.
//
// `fixed`, not `sticky`: with `sticky`, the header sits in normal document
// flow until scrolled, so at scroll position 0 it doesn't overlap the hero
// at all — every page compensates with `padding-top: var(--header-height)`
// in (site)/layout.tsx, and Hero.tsx cancels that specifically so it alone
// bleeds up to y=0.
const NAV_PILL =
  "rounded-full bg-papier/85 px-4 py-2 shadow-sm transition hover:bg-lueur/25";

// Les pages /lampe/… sont celles sur lesquelles une publicité dépose un
// visiteur froid, et ce visiteur arrive presque toujours depuis le
// navigateur interne d'Instagram. Dans ce contexte l'icône Instagram de
// l'en-tête n'est pas un lien social : c'est un bouton de sortie, affiché en
// permanence (l'en-tête est `fixed`) au-dessus d'une page dont le formulaire
// de commande n'arrive qu'au huitième écran. Touchée, elle rend la main à
// l'application, sur un profil où la seule action évidente est « Message ».
// Elle reste partout ailleurs — sur l'accueil et la boutique, le visiteur
// n'est pas au milieu d'un achat.
const estPageDePub = (chemin: string | null) => Boolean(chemin?.startsWith("/lampe/"));

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  // La barre s'efface quand on descend, revient quand on remonte.
  //
  // Elle est `fixed` et sans fond : seules ses pastilles sont opaques, et
  // elles passaient donc PAR-DESSUS le contenu qui défile. Sur un téléphone,
  // en remplissant le bon de commande, « Boutique » et « Atelier » se
  // posaient sur le champ Wilaya ; plus bas, elles couvraient trois mots de
  // la description à chaque écran. Un fond opaque réglerait la lisibilité
  // mais rendrait la barre à son tour encombrante — soixante-dix pixels pris
  // en permanence sur un écran qui en a huit cents, pendant qu'on remplit un
  // formulaire qui en fait mille.
  //
  // Descendre, c'est lire ou remplir : la barre ne sert à rien et s'en va.
  // Remonter, c'est chercher quelque chose : elle revient aussitôt, sans
  // qu'il faille atteindre le haut de la page.
  const [cachee, setCachee] = useState(false);
  const pageDePub = estPageDePub(usePathname());

  useEffect(() => {
    let ticking = false;
    // Le dernier sommet connu, pour en déduire le sens. Une variable locale à
    // l'effet, pas un état : elle change à chaque image et ne doit jamais
    // redessiner quoi que ce soit par elle-même.
    let dernierY = window.scrollY;

    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 16);

        // Le seuil de 6 px absorbe le tremblement du doigt et, sur iOS, le
        // petit rebond élastique en haut et en bas de page — sans lui, la
        // barre clignote au lieu de se décider.
        if (y < 120) {
          setCachee(false);
        } else if (y > dernierY + 6) {
          setCachee(true);
        } else if (y < dernierY - 6) {
          setCachee(false);
        }

        dernierY = y;
        ticking = false;
      });
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      // `transform`, jamais la hauteur ni la position : la barre garde sa
      // boîte, donc le scroll-snap de l'accueil continue de calculer juste
      // (voir la note plus haut sur le défilement bloqué). `pointer-events`
      // coupées une fois effacée, pour qu'un doigt posé en haut de l'écran ne
      // touche pas une pastille devenue invisible.
      style={{ transform: cachee ? "translateY(-115%)" : "translateY(0)" }}
      className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${
        cachee ? "pointer-events-none" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          style={{ transform: scrolled ? "translateY(-6px) scale(0.85)" : "translateY(0) scale(1)" }}
          className="origin-left font-heading text-2xl transition-transform duration-300"
        >
          Naja
        </Link>
        {/* "Découvrir" used to sit on the right as a second route to the same
            page the first nav pill already goes to. Dropping it makes room
            for the icons — but it was also the only shop entry point on a
            phone, since the rest of the nav is desktop-only. So Boutique is
            visible at every width now and the two wordier links stay
            desktop-only. */}
        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-3">
          <Link href="/boutique" className={NAV_PILL}>
            Boutique
          </Link>
          {/* « Horloges » visible à toutes les largeurs : c'est la nouvelle
              gamme, et la cacher derrière un point de rupture sm: reviendrait
              à la cacher à la quasi-totalité des clientes, qui arrivent
              d'Instagram sur un téléphone. */}
          <Link href="/horloges" className={NAV_PILL}>
            Horloges
          </Link>
          {/* « Atelier » reste visible à TOUTES les largeurs, contrairement à
              « Comment c'est fait » et « FAQ » juste en dessous. Le mot est court,
              et c'est une page qu'on ouvre une fois pour s'inscrire : la
              cacher derrière un point de rupture sm: reviendrait à la rendre
              introuvable sur un téléphone, c'est-à-dire là où on s'inscrit.
              Si la barre venait à déborder sur un petit écran, c'est cette
              ligne qu'il faut passer en `hidden sm:inline-flex`, pas la
              supprimer — le pied de page porte le même lien en secours. */}
          <Link href="/atelier" className={NAV_PILL}>
            Atelier
          </Link>
          <Link href="/#comment" className={`hidden sm:inline-flex ${NAV_PILL}`}>
            Comment c&apos;est fait
          </Link>
          <Link href="/#faq" className={`hidden sm:inline-flex ${NAV_PILL}`}>
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Renders only once a real handle exists in src/lib/contact.ts —
              an icon linking nowhere is worse than no icon. */}
          {instagramUrl && !pageDePub ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Naja sur Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-papier/85 shadow-sm transition hover:bg-lueur/25"
            >
              <InstagramIcon className="h-5 w-5 text-encre" aria-hidden />
            </a>
          ) : null}
          <CartLink />
        </div>
      </div>
    </header>
  );
}
