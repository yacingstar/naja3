import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="font-heading text-3xl">Page introuvable</p>
      <p className="mt-4 text-encre/70">
        Cette page n&apos;existe pas, ou n&apos;existe plus.
      </p>
      <Link
        href="/boutique"
        className="mt-8 inline-block rounded-full bg-lueur px-6 py-3 text-sm font-medium text-encre transition hover:bg-lueur/90"
      >
        Retour à la boutique
      </Link>
    </main>
  );
}
