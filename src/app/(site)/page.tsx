import { CatalogPreview } from "@/components/site/CatalogPreview";
import { Faq } from "@/components/site/Faq";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <CatalogPreview />
      <HowItWorks />
      <Faq />
    </main>
  );
}
