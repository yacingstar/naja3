import { createClient } from "@/lib/supabase/server";

export type DeliveryRate = {
  wilaya: string;
  domicilePrice: number;
  stopdeskPrice: number | null;
};

// "01 Adrar".."58 El Meniaa" — zero-padded numbers sort correctly as text.
export async function getDeliveryRates(): Promise<DeliveryRate[]> {
  const supabase = await createClient();
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
}
