import { AddDeliveryRateForm } from "@/components/admin/AddDeliveryRateForm";
import { DeliveryRateRow } from "@/components/admin/DeliveryRateRow";
import { ENCRE, G, M } from "@/components/serie/style";
import { getDeliveryRates } from "@/lib/deliveryRates";

export default async function LivraisonPage() {
  const rates = await getDeliveryRates();

  return (
    <div>
      <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>Barème</p>
      <h1 className={`${G} mt-2 text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]`}>
        Tarifs de livraison.
      </h1>
      <p className="mt-2 max-w-[56ch] text-[15px] opacity-75">
        Laissez le champ stopdesk vide si cette wilaya n&apos;a pas de point stopdesk.
      </p>

      {/* Cinquante-huit lignes de chiffres : ici, un tableau est le bon outil. */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className={`${M} border-b text-left text-[10px] tracking-[.12em] uppercase opacity-70`} style={{ borderColor: `${ENCRE}44` }}>
              <th className="py-2 pr-4 font-normal">Wilaya</th>
              <th className="py-2 pr-4 font-normal">Domicile (DA)</th>
              <th className="py-2 pr-4 font-normal">Stopdesk (DA)</th>
              <th className="py-2 pr-4" />
              <th className="py-2" />
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
