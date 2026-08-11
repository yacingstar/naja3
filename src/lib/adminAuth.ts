import "server-only";
import { createClient } from "@/lib/supabase/server";

// proxy.ts guards page navigation, but a Server Action is its own endpoint —
// it isn't protected by that redirect. Every admin Server Action must call
// this before touching the service-role client. There's no admin_users
// table: having a valid Supabase session IS the authorization check.
export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non autorisé.");
  }

  return user;
}
