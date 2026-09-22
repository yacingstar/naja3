import Image from "next/image";
import Link from "next/link";
import { LampMark } from "@/components/LampMark";
import { formatPrice } from "@/lib/format";
import { getAdminProducts } from "@/lib/adminProducts";

// Combien de teintes on montre avant de compter le reste. Au-delà, la ligne
// se met à envelopper et on ne lit plus rien.
const PASTILLES = 8;

export default async function ProduitsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[48px]">
            Produits
          </h1>
          <p className="mt-1.5 text-base font-medium text-encre/70">
            {products.length} veilleuse{products.length === 1 ? "" : "s"} ·{" "}
            {products.reduce((n, p) => n + p.colorCount, 0)} coloris
          </p>
        </div>
        <Link
          href="/admin/produits/nouveau"
          className="rounded-full bg-encre px-6 py-3 font-heading text-base text-papier shadow-[0_6px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none"
        >
          Nouveau produit
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 font-medium text-encre/60">Aucun produit pour le moment.</p>
      ) : (
        <ul className="mt-7 space-y-3">
          {products.map((product) => {
            const rupture = product.colors.filter((c) => !c.inStock).length;
            const montres = product.colors.slice(0, PASTILLES);
            const reste = product.colors.length - montres.length;

            return (
              <li key={product.id}>
                <Link
                  href={`/admin/produits/${product.id}`}
                  className="flex items-center gap-4 rounded-[1.5rem] border-2 border-encre/12 p-3 transition hover:border-encre/40 hover:bg-encre/[.03] sm:gap-5 sm:p-4"
                >
                  <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-encre/10 bg-papier sm:h-20 sm:w-20">
                    {product.photoUrl ? (
                      <Image
                        src={product.photoUrl}
                        alt=""
                        width={80}
                        height={80}
                        quality={85}
                        sizes="80px"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-encre/35">photo ?</span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-heading text-[22px] leading-none font-bold sm:text-[26px]">
                        {product.name}
                      </span>
                      <span className="font-heading text-base text-encre/75">
                        {formatPrice(product.price)}
                      </span>
                    </span>

                    {product.colorCount === 0 ? (
                      <span className="mt-2 block text-sm font-semibold text-encre/60">
                        Aucun coloris — cette veilleuse ne peut pas être commandée.
                      </span>
                    ) : (
                      <>
                        <span className="mt-2 flex flex-wrap items-center gap-1">
                          {montres.map((c) => (
                            <span
                              key={c.id}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border border-encre/15 bg-papier ${
                                c.inStock ? "" : "opacity-35"
                              }`}
                            >
                              <LampMark hex={c.hex} hex2={c.hex2} className="h-5 w-5" />
                            </span>
                          ))}
                          {reste > 0 ? (
                            <span className="ml-0.5 font-heading text-[13px] text-encre/60">
                              +{reste}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1.5 block text-[13px] font-semibold text-encre/55">
                          {product.colorCount} coloris
                          {rupture > 0 ? ` · ${rupture} en rupture` : ""}
                        </span>
                      </>
                    )}
                  </span>

                  <span aria-hidden className="shrink-0 pr-1 text-encre/30">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
