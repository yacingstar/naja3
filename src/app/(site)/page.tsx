import { CatalogPreview } from "@/components/site/CatalogPreview";
import { CraftSteps } from "@/components/site/CraftSteps";
import { Faq } from "@/components/site/Faq";
import { Hero } from "@/components/site/Hero";
import { ScrollSnapHomepage } from "@/components/site/ScrollSnapHomepage";
import { TrustStrip } from "@/components/site/TrustStrip";

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
