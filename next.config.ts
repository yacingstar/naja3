import type { NextConfig } from "next";

// Product photos live in Supabase Storage, and next/image refuses to
// optimize a remote host that isn't allowlisted. Derived from the same env
// var the browser client already uses rather than hardcoded, so swapping
// Supabase projects stays a one-line .env change. Next loads .env before
// evaluating this file (visible in the build log: "Environments: .env.local"
// prints first), so the value is there for a normal build.
//
// The wildcard fallback keeps a build working somewhere .env isn't present
// (CI doing a type-check, say) without widening the allowlist to the whole
// internet — still Supabase only, still the public-object path only.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  // Testing on a real phone means loading the dev server over the LAN IP
  // (http://192.168.x.x:3000), and `next dev` treats any origin other than
  // the one it booted on as cross-origin — it answers 403 for everything
  // under /_next/static. The HTML still renders, so the page looks like it
  // half-works: hero and footer show, while every section wrapped in
  // <Reveal> stays at opacity 0 forever, because the client JS that runs
  // its IntersectionObserver never loaded.
  //
  // Private LAN ranges only, and dev-only — `next start` and any deployment
  // ignore this setting entirely.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "172.17.*.*"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        port: "",
        // Storage public URLs are /storage/v1/object/public/<bucket>/<path>
        pathname: "/storage/v1/object/public/**",
        search: "",
      },
    ],
    // Next 16 turned `qualities` into an allowlist (default `[75]`); a
    // `quality` prop outside it gets coerced to the nearest allowed value,
    // and a direct hit on the optimizer endpoint with another value 400s.
    //
    // 85 rather than the default 75 on purpose: every product photo here is
    // a background-removed cutout, and soft edges plus drop shadows are
    // exactly where lossy artefacts (halos, banding) show up first. The
    // saving over 75 is small; the risk of visible fringing isn't worth it.
    qualities: [85],
    // Next 16 added an SSRF guard that refuses to fetch an upstream image
    // whose hostname resolves to a private IP. On a NAT64/DNS64 network —
    // this dev machine's, and plenty of IPv6-only mobile networks —
    // Supabase's perfectly public Cloudflare addresses come back in
    // NAT64 form (64:ff9b::6812:260a is literally 104.18.38.10), and
    // 64:ff9b::/96 gets classified as private. Every product photo then
    // fails with a generic 400 '"url" parameter is not allowed', which
    // points at remotePatterns and sends you hunting the wrong bug; the
    // real reason only appears in the server log.
    //
    // Safe here specifically because remotePatterns above is tight: exact
    // protocol, exact Supabase host, fixed path prefix, no query string.
    // The optimizer therefore cannot be aimed at an internal address no
    // matter what `url` a caller passes, so what this flag actually
    // disables is second-guessing the resolved IP of one pinned public
    // host. Revisit if remotePatterns is ever widened.
    dangerouslyAllowLocalIP: true,
  },
  experimental: {
    serverActions: {
      // Default is 1MB — too small for real phone/camera product photos
      // (a modern phone JPEG is routinely 3-10MB). Admin photo uploads go
      // straight through a Server Action carrying the raw file bytes
      // (src/app/admin/(espace)/produits/actions.ts), so this needs to be
      // generous. Worth re-checking against Netlify's own request body
      // limits once deployed (Phase 7) — this only controls Next's own cap.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
