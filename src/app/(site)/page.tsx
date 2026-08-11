import { CatalogPreview } from "@/components/site/CatalogPreview";
import { Faq } from "@/components/site/Faq";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { ScrollSnapHomepage } from "@/components/site/ScrollSnapHomepage";

export default function HomePage() {
  return (
    <main>
      <ScrollSnapHomepage />
      <Hero />
      <CatalogPreview />
      <HowItWorks />
      <Faq />
    </main>
  );
}
