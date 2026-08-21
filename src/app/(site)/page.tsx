import { CatalogPreview } from "@/components/site/CatalogPreview";
import { CraftSteps } from "@/components/site/CraftSteps";
import { Faq } from "@/components/site/Faq";
import { Hero } from "@/components/site/Hero";
import { ScrollSnapHomepage } from "@/components/site/ScrollSnapHomepage";
import { TrustStrip } from "@/components/site/TrustStrip";

// Prerender and serve from the CDN, re-rendering at most every 5 minutes.
//
// Before this, every visitor triggered a serverless invocation and a fresh
// Supabase query: measured ~800ms TTFB warm, and 3.9s when the function had
// gone cold. Ad traffic is exactly the case that hits cold functions, so a
// share of paid visitors were waiting ~4s for a first byte.
//
// 5 minutes is a backstop, not the main mechanism — the admin's product
// actions call revalidatePath on these routes, so an edit shows up straight
// away. The window only matters if on-demand revalidation ever fails, and it
// bounds how stale things can get to something a shop owner won't notice.
export const revalidate = 300;

export default function HomePage() {
  return (
    <main>
      <ScrollSnapHomepage />
      <Hero />
      <TrustStrip />
      <CatalogPreview />
      <CraftSteps />
      <Faq />
    </main>
  );
}
