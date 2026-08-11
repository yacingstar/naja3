import { BlobPhoto } from "@/components/site/BlobPhoto";
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
    <div className="flex flex-col items-center text-center">
      <BlobPhoto
        src={product.photoUrl}
        alt={product.name}
        variant={VARIANTS[index % VARIANTS.length]}
        className="w-full max-w-[220px]"
      />
      <h3 className="mt-6 font-heading text-lg">{product.name}</h3>
      <p className="mt-1 text-sm text-encre/70">{product.price} DA</p>
    </div>
  );
}
