"use client";

import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/analytics";

// Meta's base code minus its inline `fbq('track','PageView')`: page views are
// fired on every route change by PageViewTracker instead (see the note there
// on why a single-page app needs that).
//
// Loaded with `afterInteractive` (next/script's default): early, but after
// hydration has begun, so a tracker never competes with the page itself for
// the first paint. `beforeInteractive` is documented for critical scripts and
// would put Facebook ahead of your own content.
export function MetaPixel() {
  // Nothing is rendered at all when the ID isn't configured, so local
  // development never pollutes the ad account.
  if (!META_PIXEL_ID) return null;

  return (
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
  );
}
