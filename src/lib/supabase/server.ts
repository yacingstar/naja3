import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For use in Server Components/Server Functions. Runs with the anon key and
// the current user's session — RLS applies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies directly —
            // safe to ignore once proxy.ts is refreshing the session (Phase 5).
          }
        },
      },
    },
  );
}
