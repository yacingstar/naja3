import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Landing point for links in Supabase auth emails (password recovery today,
// email confirmation if that's ever turned on).
//
// Without this route the link had nowhere to go: Supabase verified the token
// and redirected to the site URL, no page read the token, and the visitor
// ended up on the homepage wondering what happened. Changing the Site URL in
// the dashboard from localhost to najadz.com only changed *where* that
// silent failure landed.
//
// Both token shapes are handled because which one arrives depends on the
// email template in the dashboard:
//   token_hash + type  — the current recommended template ({{ .TokenHash }})
//   code               — the default {{ .ConfirmationURL }} template, which
//                        bounces through Supabase and comes back with a PKCE
//                        code that has to be exchanged server-side.
//
// This deliberately sits outside /admin. proxy.ts redirects anyone without a
// session away from /admin, and during recovery the session doesn't exist
// until the token is verified — putting it under /admin would bounce the
// visitor to the login page before the token was ever read.
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Behind Netlify the request URL can carry an internal host, so prefer the
  // forwarded host when rebuilding absolute redirect URLs.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  // Recovery has to land on the set-a-new-password form; anything else can go
  // straight to the dashboard. `next` is validated as a relative path so this
  // can't be used as an open redirect.
  const requestedNext = url.searchParams.get("next");
  const safeNext =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : type === "recovery" || !type
        ? "/auth/nouveau-mot-de-passe"
        : "/admin";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(safeNext, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, origin));
  }

  // Expired, already used, or opened in a different browser than the one that
  // requested it (PKCE ties the code to a cookie on the requesting browser).
  return NextResponse.redirect(new URL("/admin/connexion?erreur=lien", origin));
}
