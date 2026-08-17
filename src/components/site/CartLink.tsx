"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { totalQuantity } = useCart();

  return (
    <Link
      href="/panier"
      className="flex items-center gap-2 rounded-full bg-papier/85 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-lueur/25"
    >
      Panier
      {totalQuantity > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lueur px-1 text-xs text-encre">
          {totalQuantity}
        </span>
      ) : null}
    </Link>
  );
}
