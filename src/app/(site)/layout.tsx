import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MetaPixel } from "@/components/site/MetaPixel";
import { CartProvider } from "@/lib/cart";

// The pixel goes in THIS layout, not the root one, so it covers the shop and
// nothing else. In the root layout it would also track /admin — meaning every
// time the owner edits a product, Meta records her as an engaged visitor and
// starts optimising the ads toward people who behave like the shopkeeper.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <MetaPixel />
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
