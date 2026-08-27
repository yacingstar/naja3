import { cache } from "react";
// The cookie-free client on purpose — see supabase/public.ts. The rate card
// is one public price list, identical for every visitor. This used to use the
// session-aware client, which was harmless while the only caller was the
// dynamic /commande page; now that the direct order form puts a wilaya picker
// on every product page, reading cookies here would make all six of them
// re-render per request and turn their `revalidate` into a no-op.
import { createPublicClient } from "@/lib/supabase/public";

export type DeliveryRate = {
  wilaya: string;
  domicilePrice: number;
  stopdeskPrice: number | null;
};

// `cache` de-duplicates within a single render pass, the same way products.ts
// does — a page that needs the rates in both its body and its metadata makes
// one query, not two.
//
// "01 Adrar".."58 El Meniaa" — zero-padded numbers sort correctly as text.
export const getDeliveryRates = cache(async function getDeliveryRates(): Promise<
  DeliveryRate[]
> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("delivery_rates")
    .select("wilaya, domicile_price, stopdesk_price")
    .order("wilaya", { ascending: true });

  if (error || !data) return [];

  return data.map((rate) => ({
    wilaya: rate.wilaya,
    domicilePrice: rate.domicile_price,
    stopdeskPrice: rate.stopdesk_price,
  }));
});
