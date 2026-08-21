import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Anon-key client with NO session and NO cookies, for reading data that is
// public to everyone: the catalogue.
//
// Two reasons it exists rather than reusing supabase/server.ts:
//
// 1. Cacheability. That client calls `cookies()`, and reading cookies makes a
//    route dynamic — Next has to re-render it per request, so `revalidate` on
//    the page can never take effect. Every storefront page was therefore
//    invoking a serverless function and re-querying Supabase for every single
//    visitor. Nothing in the catalogue depends on who is asking, so nothing
//    there needs the cookie jar.
//
// 2. Safety of the cache itself, which matters more. A cached page is shared
//    by every visitor, so rendering one with a session-aware client is how
//    one person's data ends up served to somebody else. Being explicitly
//    anonymous makes that impossible by construction rather than by care:
//    there is no session to leak.
//
// Anything that depends on the visitor — admin screens, order lookups — must
// keep using supabase/server.ts and stay dynamic.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
