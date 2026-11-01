"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

// The pixels' copy-paste snippets assume a traditional website where every
// click loads a new document. This is a single-page app: navigating from the
// homepage to a lamp never reloads anything, so an inline page-view call in
// the snippet would fire exactly once per visit, and the ad platforms would
// think nobody ever browsed past the first page.
//
// So the snippets (MetaPixel, TikTokPixel) only initialise, and the page view
// is fired from this effect, which re-runs whenever the route changes —
// including the first render, which is why the inline calls are deliberately
// absent rather than duplicated.
//
// One tracker for every pixel: trackPageView fans out to each configured
// platform. It must be rendered AFTER the pixel components in the layout, so
// their scripts have defined `fbq` / `ttq` by the time this effect runs.
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}

export function PageViewTracker() {
  // useSearchParams needs a Suspense boundary, otherwise it opts the whole
  // route out of static rendering — which would undo the CDN caching the
  // storefront depends on.
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
