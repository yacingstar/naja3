"use client";

import { useState } from "react";
import { BlobPhoto } from "@/components/site/BlobPhoto";
import type { ProductColorDetail } from "@/lib/products";

// Colors come pre-sorted in-stock-first (see getProductBySlug), so the
// default selection is always something a customer can actually buy.
export function ProductGallery({ colors }: { colors: ProductColorDetail[] }) {
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id);
  const [photoIndex, setPhotoIndex] = useState(0);

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? colors[0];
  const photo = selectedColor?.photos[photoIndex];

  function selectColor(id: number) {
    setSelectedColorId(id);
    setPhotoIndex(0);
  }

  if (!selectedColor) {
    return <BlobPhoto alt="" variant="a" className="mx-auto w-full max-w-sm" />;
  }

  return (
    <div>
      <BlobPhoto
        src={photo?.url}
        alt={`${selectedColor.colorName}`}
        variant="a"
        className="mx-auto w-full max-w-sm"
      />

      {selectedColor.photos.length > 1 ? (
        <div className="mt-6 flex justify-center gap-3">
          {selectedColor.photos.map((p, index) => (
            <button
              key={p.url}
              type="button"
              onClick={() => setPhotoIndex(index)}
              aria-label={`Photo ${index + 1}`}
              aria-current={index === photoIndex}
              className={`h-14 w-14 overflow-hidden rounded-full border-2 transition ${
                index === photoIndex ? "border-lueur" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, thumbnail-only */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Couleur"
        className="mt-8 flex flex-wrap justify-center gap-3"
      >
        {colors.map((color) => {
          const isSelected = color.id === selectedColor.id;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!color.inStock}
              onClick={() => selectColor(color.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                isSelected ? "border-encre" : "border-encre/20"
              } ${
                color.inStock
                  ? "hover:border-encre"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <span
                aria-hidden
                className="h-3 w-3 rounded-full border border-encre/20"
                style={{ backgroundColor: color.colorHex ?? "#e5d9cf" }}
              />
              {color.colorName}
              {!color.inStock ? (
                <span className="text-xs text-encre/50">(rupture)</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
