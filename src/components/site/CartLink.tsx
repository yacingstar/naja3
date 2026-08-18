"use client";

import Link from "next/link";
import { BagIcon } from "@/components/site/Icons";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { totalQuantity } = useCart();

  return (
    <Link
      href="/panier"
      // Icon-only, so the label moves to aria-label and the count goes with
      // it — a bare "3" would be read out with no idea what it counts.
      aria-label={
        totalQuantity > 0
          ? `Panier, ${totalQuantity} article${totalQuantity > 1 ? "s" : ""}`
          : "Panier"
      }
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-papier/85 shadow-sm transition hover:bg-lueur/25"
    >
      <BagIcon className="h-5 w-5 text-encre" aria-hidden />
      {totalQuantity > 0 ? (
        <span
          aria-hidden
          // Sits on the bag's shoulder rather than inline, so the button
          // stays a fixed circle whether the cart is empty or not and the
          // header never shifts when something is added.
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lueur px-1 text-xs font-medium text-encre shadow-sm"
        >
          {totalQuantity}
        </span>
      ) : null}
    </Link>
  );
}
