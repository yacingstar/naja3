import { CheckoutForm } from "@/components/site/CheckoutForm";
import { getDeliveryRates } from "@/lib/deliveryRates";

export default async function CommandePage() {
  const rates = await getDeliveryRates();

  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="text-center font-heading text-3xl">Votre commande</h1>
      <CheckoutForm rates={rates} />
    </main>
  );
}
