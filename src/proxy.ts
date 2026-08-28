import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts. This keeps the Supabase
// session cookie fresh on /admin requests and bounces signed-out visitors to
// the login page.
//
// It is deliberately an OPTIMISTIC check and not the security boundary. Next's
// own guidance is that proxy "should not be used as a full session management
// or authorization solution" and must "avoid database checks", because it runs
// on every request to a matched path — including prefetches, and the admin nav
// prefetches Commandes/Produits/Livraison constantly. Authorization is enforced
// twice for real, server-side: the (espace) layout calls getAdminUser(), and
// every admin Server Action calls requireAdminUser() before it touches the
// service-role client (a Server Action is its own endpoint and is not covered
// by the redirect below).
//
// This used to call `supabase.auth.getUser()` on every request, which is a
// network round-trip to the Auth server. Netlify runs this as an edge function
// with a request deadline, and when Supabase answered slowly the whole
// invocation was killed — surfacing to the client as
// "There was an internal error while processing your request", with
// `AuthRetryableFetchError: The signal has been aborted` underneath. Three
// things changed to make that impossible:
//
//   1. No session cookie -> redirect immediately, with no network call at all.
//      That is every bot and every signed-out hit, for free.
//   2. `getClaims()` instead of `getUser()`. This project signs its JWTs with
//      an asymmetric key (ES256 — confirmed at /auth/v1/.well-known/jwks.json),
//      so getClaims verifies the token locally with WebCrypto instead of
//      asking the Auth server. It still refreshes the session when the token
//      is close to expiring, which is the other job this file has: Server
//      Components cannot write cookies, so nowhere else can refresh it.
//   3. Anything that does reach the network is bounded by our own timeout and
//      wrapped in a catch that fails OPEN. Failing open is safe precisely
//      because this is optimistic: the request continues to the layout, which
//      does the authoritative check. Failing closed would sign the admin out
//      every time Supabase hiccuped.

// The key @supabase/ssr stores the session under, derived the way it derives
// it: sb-<project-ref>-auth-token, split into `.0`, `.1` chunks when large.
const SESSION_COOKIE = `sb-${
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]
}-auth-token`;

// Long enough that a healthy round-trip always fits, short enough to return an
// answer before Netlify's edge deadline kills the invocation.
const AUTH_TIMEOUT_MS = 3000;

// Matched exactly or as a numbered chunk — NOT by prefix. Supabase also parks
// `<key>-code-verifier` cookies during the OAuth/magic-link flow, and treating
// one of those as a session would let a half-finished sign-in through.
function hasSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name === SESSION_COOKIE ||
        /^(.+)\.\d+$/.exec(name)?.[1] === SESSION_COOKIE,
    );
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/connexion";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const isLoginRoute = request.nextUrl.pathname === "/admin/connexion";

  if (!hasSessionCookie(request)) {
    return isLoginRoute ? NextResponse.next() : loginRedirect(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Our own deadline, so a slow Auth server produces a caught error here
        // instead of an aborted edge function and a 500 for the client.
        fetch: (input, init) => {
          const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
          return fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, timeout])
              : timeout,
          });
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const { data, error } = await supabase.auth.getClaims();

    // Only redirect on a definite "this token is not valid". An `error` here is
    // a network or key-discovery problem, not a verdict on the visitor, so it
    // falls through to the layout rather than signing them out.
    if (!error && !data?.claims && !isLoginRoute) {
      return loginRedirect(request);
    }
  } catch {
    // Timed out or threw. Carry on: the layout re-checks properly.
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
