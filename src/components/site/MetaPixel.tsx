"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { META_PIXEL_ID, trackPageView } from "@/lib/analytics";

// Meta's copy-paste snippet assumes a traditional website where every click
// loads a new document. This is a single-page app: navigating from the
// homepage to a lamp never reloads anything, so their inline
// `fbq('track','PageView')` would fire exactly once per visit and Meta would
// think nobody ever browsed past the first page.
//
// So the snippet below only does `init`, and PageView is fired from an effect
// that re-runs whenever the route changes — including the first render, which
// is why the inline call is deliberately absent rather than duplicated here.
//
// Loaded with `afterInteractive` (next/script's default): early, but after
// hydration has begun, so a tracker never competes with the page itself for
// the first paint. `beforeInteractive` is documented for critical scripts and
// would put Facebook ahead of your own content.
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  // Nothing is rendered at all when the ID isn't configured, so local
  // development never pollutes the ad account.
  if (!META_PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');`}
      </Script>
      {/* useSearchParams needs a Suspense boundary, otherwise it opts the
          whole route out of static rendering — which would undo the CDN
          caching the storefront depends on. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
