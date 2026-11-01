import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MetaPixel } from "@/components/site/MetaPixel";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { TikTokPixel } from "@/components/site/TikTokPixel";
import { CartProvider } from "@/lib/cart";

// The pixels go in THIS layout, not the root one, so they cover the shop and
// nothing else. In the root layout they would also track /admin — meaning
// every time the owner edits a product, Meta and TikTok record her as an
// engaged visitor and start optimising the ads toward people who behave like
// the shopkeeper.
//
// Order matters: PageViewTracker comes after both pixels so their scripts
// have run by the time it fires the first page view.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <MetaPixel />
      <TikTokPixel />
      <PageViewTracker />
      <Header />
      {/* Header is fixed (see Header.tsx) — every page needs this padding
          so content doesn't start hidden underneath it. Hero.tsx cancels
          it with a matching negative margin so the homepage alone bleeds
          up to y=0, behind the header's transparent-at-top state. */}
      <div style={{ paddingTop: "var(--header-height)" }}>{children}</div>
      <Footer />
    </CartProvider>
  );
}
