import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Two different questions, deliberately answered two different ways.
//
// "May this person SEE an admin page?" is gated by getAdminUser below, which
// verifies the JWT locally. "May this person WRITE?" is gated by
// requireAdminUser, which asks the Auth server. The split is not an
// optimisation dressed up as a design — it follows what each path can
// actually reach:
//
//   * Pages read through the anon-key client, so every query they make is
//     subject to RLS, and `orders`/`order_items` are denied to anonymous
//     callers outright (verified: PostgREST answers 401). Crucially, RLS
//     validates the JWT's *signature* and expiry and does not consult
//     revocation either — so a revoked-but-unexpired token could read those
//     rows straight from PostgREST no matter what this file does. Spending a
//     network round-trip per page render to check revocation buys nothing the
//     database isn't already conceding.
//
//   * Server Actions write through the SERVICE-ROLE client, which bypasses
//     RLS completely. There the check here is the only thing standing in
//     front of the data, so it stays authoritative. Actions run on submit,
//     not on every render, so the round-trip costs nothing that matters.
//
// This used to be one cached getUser() shared by both, which put a full
// round-trip to Supabase Auth in front of every admin page render — a
// measured 200-490ms before any HTML could exist, on a panel that is nearly
// always cold-starting anyway.

// Page gate. Verifies the access token locally with WebCrypto: this project
// signs with an asymmetric key (ES256, confirmed at
// /auth/v1/.well-known/jwks.json), so getClaims checks the signature and
// expiry without leaving the process.
export const getAdminUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (!error) {
    return data?.claims?.sub ? { id: String(data.claims.sub) } : null;
  }

  // getClaims only reports an error for a network or key-discovery problem,
  // never as a verdict on the token. Rather than guess, fall back to the
  // authoritative call — slower, but it degrades to exactly the behaviour
  // this file had before, instead of locking the owner out of her own admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { id: user.id } : null;
});

// Write gate. Every admin Server Action must call this before touching the
// service-role client — a Server Action is a POST to its own route and is not
// covered by proxy.ts's redirect, as the Next docs spell out. There's no
// admin_users table: holding a valid Supabase session IS the authorization.
//
// Asks the Auth server on purpose. This is the one place where revocation
// genuinely matters, because service-role writes answer to nothing else.
export const requireAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non autorisé.");
  }

  return user;
});
