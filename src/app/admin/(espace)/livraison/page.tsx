import { AddDeliveryRateForm } from "@/components/admin/AddDeliveryRateForm";
import { DeliveryRateRow } from "@/components/admin/DeliveryRateRow";
import { getDeliveryRates } from "@/lib/deliveryRates";

export default async function LivraisonPage() {
  const rates = await getDeliveryRates();

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[48px]">
        Tarifs de livraison
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        Laissez le champ stopdesk vide si cette wilaya n&apos;a pas de point stopdesk.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-encre/15 text-left text-encre/55">
              <th className="py-2 pr-4 text-[13px] font-semibold uppercase tracking-[.05em]">Wilaya</th>
              <th className="py-2 pr-4 text-[13px] font-semibold uppercase tracking-[.05em]">Domicile (DA)</th>
              <th className="py-2 pr-4 text-[13px] font-semibold uppercase tracking-[.05em]">Stopdesk (DA)</th>
              <th className="py-2 pr-4 font-medium" />
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <DeliveryRateRow key={rate.wilaya} rate={rate} />
            ))}
          </tbody>
        </table>
      </div>

      <AddDeliveryRateForm />
    </div>
  );
}
