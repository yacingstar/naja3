import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { CartProvider } from "@/lib/cart";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
    </CartProvider>
  );
}
