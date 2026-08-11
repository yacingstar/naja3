export function Footer() {
  return (
    <footer className="snap-section mt-auto border-t border-encre/10 px-6 py-10 text-center">
      {/* snap-section is inert everywhere scroll-snap-type isn't set on an
          ancestor (i.e. every page except the homepage) — see
          ScrollSnapHomepage.tsx. On the homepage, without this the last
          snap point (FAQ) sits just short of the true page end, and
          proximity-snap scrolling gets stuck there, unable to reach the
          footer at all (confirmed while testing). Making the footer itself
          the final snap point means the last stop actually is the end. */}
      <p className="font-heading text-xl">Naja</p>
      <p className="mt-2 font-hand text-lg text-crepuscule">
        fait main, avec soin
      </p>
      <p className="mt-4 text-xs text-encre/50">
        © {new Date().getFullYear()} Naja. Tous droits réservés.
      </p>
    </footer>
  );
}
