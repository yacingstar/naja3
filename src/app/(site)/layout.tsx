import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { CartProvider } from "@/lib/cart";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
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
