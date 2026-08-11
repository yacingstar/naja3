export function Footer() {
  return (
    <footer className="mt-auto border-t border-encre/10 px-6 py-10 text-center">
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
