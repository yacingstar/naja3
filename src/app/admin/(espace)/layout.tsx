import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { getAdminUser } from "@/lib/adminAuth";

// Backstop behind proxy.ts's redirect — belt and suspenders, not the only
// guard (see src/proxy.ts and src/lib/adminAuth.ts for the other two).
// Goes through the request-cached getAdminUser so this check and the Server
// Actions' checks share one round-trip instead of each paying for their own.
export default async function EspaceLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();

  if (!user) redirect("/admin/connexion");

  return (
    <div className="min-h-screen bg-papier text-encre">
      {/* Collante : sur un téléphone, la liste des commandes est longue et
          remonter en haut pour changer d'onglet était une corvée. */}
      <header className="sticky top-0 z-30 border-b-2 border-encre/10 bg-papier/95 px-5 py-3 backdrop-blur sm:px-8">
        {/* Sur un téléphone la barre se coupe en deux : le logo et la
            déconnexion sur la première ligne, les onglets sur toute la largeur
            en dessous. Sans ça, « Se déconnecter » se retrouvait coincé à
            droite des onglets et s'écrivait sur deux lignes. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2.5">
          <Link href="/admin" className="mr-auto flex items-baseline gap-2">
            <span className="font-heading text-[26px] leading-none font-bold tracking-[-.02em]">
              naja
            </span>
            <span className="rounded-full bg-encre px-2.5 py-1 font-heading text-[11px] text-papier">
              gestion
            </span>
          </Link>
          <AdminNav className="order-last w-full md:order-none md:w-auto" />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
