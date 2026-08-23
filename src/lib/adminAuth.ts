import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// getUser() is a network round-trip to Supabase Auth (~140ms measured), and
// an admin page made at least two of them back to back: the (espace) layout
// checked, then the page or its Server Action checked again. React's `cache`
// collapses those into one call per request while keeping every call site's
// check intact — the guards are unchanged, they just stop re-asking.
//
// proxy.ts still does its own check, and can't share this: middleware runs in
// a separate context before the render begins.
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// proxy.ts guards page navigation, but a Server Action is its own endpoint —
// it isn't protected by that redirect. Every admin Server Action must call
// this before touching the service-role client. There's no admin_users
// table: having a valid Supabase session IS the authorization check.
export async function requireAdminUser() {
  const user = await getAdminUser();

  if (!user) {
    throw new Error("Non autorisé.");
  }

  return user;
}
