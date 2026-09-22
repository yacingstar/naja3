"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/admin/connexion");
      router.refresh();
    });
  }

  return (
    <AdminButton
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      pending={isPending}
      pendingLabel="Déconnexion…"
      className="shrink-0 whitespace-nowrap"
    >
      Se déconnecter
    </AdminButton>
  );
}
