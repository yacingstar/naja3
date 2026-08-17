import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
