import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";

// Backstop behind proxy.ts's redirect — belt and suspenders, not the only
// guard (see src/proxy.ts and src/lib/adminAuth.ts for the other two).
export default async function EspaceLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/connexion");

  return (
    <div className="min-h-screen bg-papier text-encre">
      <header className="border-b border-encre/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin" className="font-heading text-xl">
            Naja — gestion
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/admin/commandes" className="hover:text-lueur">
              Commandes
            </Link>
            <Link href="/admin/produits" className="hover:text-lueur">
              Produits
            </Link>
            <Link href="/admin/livraison" className="hover:text-lueur">
              Livraison
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
