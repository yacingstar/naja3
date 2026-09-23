import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";
import { getAdminUser } from "@/lib/adminAuth";

// Backstop behind proxy.ts's redirect — belt and suspenders, not the only
// guard (see src/proxy.ts and src/lib/adminAuth.ts for the other two).
// Goes through the request-cached getAdminUser so this check and the Server
// Actions' checks share one round-trip instead of each paying for their own.
export default async function EspaceLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();

  if (!user) redirect("/admin/connexion");

  return (
    <div className="min-h-screen">
      {/* Le même bandeau que la boutique, en plus sobre : le nom, les onglets,
          la sortie. Collante, parce que la liste des commandes est longue et
          qu'on la traite depuis un téléphone. */}
      <header
        className="sticky top-0 z-30 border-b bg-[#ebe3d3]/95 px-5 py-3.5 backdrop-blur sm:px-10"
        style={{ borderColor: `${ENCRE}33` }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2.5">
          <Link href="/admin" className={`${G} mr-auto flex items-center gap-1.5 text-[17px] font-bold uppercase`}>
            Naja
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROUGE }} />
            <span className={`${M} ml-1 text-[10px] tracking-[.14em] normal-case opacity-60`}>gestion</span>
          </Link>
          {/* Sur un écran étroit, les onglets passent sur toute la largeur en
              dessous : sinon « Se déconnecter » s'écrit sur deux lignes. */}
          <AdminNav className="order-last w-full md:order-none md:w-auto" />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">{children}</main>
    </div>
  );
}
