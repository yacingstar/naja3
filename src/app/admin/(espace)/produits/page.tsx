import Image from "next/image";
import Link from "next/link";
import { ENCRE, G, M, riso, ROUGE } from "@/components/serie/style";
import { formatPrice } from "@/lib/format";
import { getAdminProducts } from "@/lib/adminProducts";

// La liste des produits, comme l'index de la boutique : numéro en rouge,
// vignette sur son encre, nom, nuancier, prix aligné à droite.

// Combien de teintes on montre avant de compter le reste. Au-delà, la ligne se
// met à envelopper et on ne lit plus rien.
const PASTILLES = 10;

export default async function ProduitsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>Catalogue</p>
          <h1 className={`${G} mt-2 text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]`}>
            Produits.
          </h1>
          <p className={`${M} mt-2 text-[11px] tracking-[.12em] uppercase opacity-70`}>
            {products.length} forme{products.length === 1 ? "" : "s"} ·{" "}
            {products.reduce((n, p) => n + p.colorCount, 0)} coloris
          </p>
        </div>
        <Link
          href="/admin/produits/nouveau"
          className={`${M} px-5 py-3 text-[11px] tracking-[.12em] text-[#f6efe1] uppercase transition hover:opacity-90`}
          style={{ background: ENCRE }}
        >
          Nouveau produit
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 opacity-60">Aucun produit pour le moment.</p>
      ) : (
        <ol className="mt-8">
          {products.map((product, i) => {
            const rupture = product.colors.filter((c) => !c.inStock).length;
            const montres = product.colors.slice(0, PASTILLES);
            const reste = product.colors.length - montres.length;
            const encre = riso(i);

            return (
              <li key={product.id}>
                <Link
                  href={`/admin/produits/${product.id}`}
                  className="group flex items-center gap-4 border-b py-4 transition-colors hover:bg-[#1d1a17]/[.04] sm:gap-5"
                  style={{ borderColor: `${ENCRE}26` }}
                >
                  <span className={`${M} hidden w-10 shrink-0 text-[11px] sm:block`} style={{ color: ROUGE }}>
                    № {String(i + 1).padStart(2, "0")}
                  </span>

                  <span
                    className="riso relative flex h-[64px] w-[52px] shrink-0 items-center justify-center overflow-hidden"
                    style={{ background: encre.fond }}
                  >
                    {product.photoUrl ? (
                      <Image
                        src={product.photoUrl}
                        alt=""
                        fill
                        quality={85}
                        sizes="52px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className={`${M} text-[9px] text-[#f6efe1]/70`}>photo ?</span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className={`${G} block truncate text-[20px] font-semibold tracking-[-.01em]`}>
                      {product.name}
                    </span>

                    {product.colorCount === 0 ? (
                      <span className={`${M} mt-1.5 block text-[10px] tracking-[.1em] uppercase`} style={{ color: ROUGE }}>
                        Aucun coloris — non commandable
                      </span>
                    ) : (
                      <>
                        <span className="mt-2 flex flex-wrap items-center gap-1">
                          {montres.map((c) => (
                            <span
                              key={c.id}
                              className={`h-3.5 w-3.5 border ${c.inStock ? "" : "opacity-30"}`}
                              style={{
                                borderColor: `${ENCRE}44`,
                                background: c.hex2
                                  ? `linear-gradient(to bottom, ${c.hex ?? "#ddd"} 50%, ${c.hex2} 50%)`
                                  : (c.hex ?? "#ddd"),
                              }}
                            />
                          ))}
                          {reste > 0 ? (
                            <span className={`${M} ml-1 text-[10px] opacity-60`}>+{reste}</span>
                          ) : null}
                        </span>
                        <span className={`${M} mt-1.5 block text-[10px] tracking-[.1em] uppercase opacity-60`}>
                          {product.colorCount} coloris
                          {rupture > 0 ? ` · ${rupture} en rupture` : ""}
                        </span>
                      </>
                    )}
                  </span>

                  <span className={`${G} shrink-0 text-[18px] font-semibold tabular-nums`}>
                    {formatPrice(product.price)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
