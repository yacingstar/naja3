import Link from "next/link";
import { BlobPhoto } from "@/components/site/BlobPhoto";
import { Reveal } from "@/components/site/Reveal";
import { formatPrice } from "@/lib/format";
import type { FeaturedProduct } from "@/lib/products";

const VARIANTS = ["a", "b", "c"] as const;

export function ProductCard({
  product,
  index,
}: {
  product: FeaturedProduct;
  index: number;
}) {
  return (
    <Reveal delay={(index % 4) * 80}>
      <Link
        href={`/boutique/${product.slug}`}
        className="flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03]"
      >
        <BlobPhoto
          src={product.photoUrl}
          alt={product.name}
          variant={VARIANTS[index % VARIANTS.length]}
          className="w-full max-w-[220px]"
        />
        <h3 className="mt-6 font-heading text-lg">{product.name}</h3>
        <p className="mt-1 text-sm text-encre/70">{formatPrice(product.price)}</p>
      </Link>
    </Reveal>
  );
}
