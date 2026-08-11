import { notFound } from "next/navigation";
import Link from "next/link";
import { InternalNotesForm } from "@/components/admin/InternalNotesForm";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { formatPrice } from "@/lib/format";
import { getOrderById } from "@/lib/orders";

export default async function CommandeDetailPage({
  params,
}: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;
  const orderId = Number(id);
  const order = Number.isFinite(orderId) ? await getOrderById(orderId) : null;

  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/commandes" className="text-sm text-encre/60 hover:text-encre">
        ← Toutes les commandes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl">Commande #{order.id}</h1>
        <OrderStatusControl orderId={order.id} status={order.status} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-lg">Client</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="Nom">
              {order.customerFirstName} {order.customerLastName}
            </Row>
            <Row label="Téléphone">{order.phone}</Row>
            <Row label="Adresse">
              {order.commune}, {order.wilaya}
            </Row>
            <Row label="Livraison">
              {order.deliveryMethod === "domicile" ? "À domicile" : "Stopdesk"} —{" "}
              {formatPrice(order.deliveryFee)}
            </Row>
            {order.notesClient ? <Row label="Note du client">{order.notesClient}</Row> : null}
          </dl>

          <h2 className="mt-8 font-heading text-lg">Note interne</h2>
          <div className="mt-3">
            <InternalNotesForm orderId={order.id} initialNotes={order.internalNotes} />
          </div>
        </section>

        <section>
          <h2 className="font-heading text-lg">Articles</h2>
          <ul className="mt-3 divide-y divide-encre/10 border-y border-encre/10 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-3">
                <span>
                  {item.quantity} × {item.productName} ({item.colorName})
                </span>
                <span>{formatPrice(item.priceAtOrder * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-sm">
            <p className="flex justify-between">
              <span>Sous-total</span>
              <span>{formatPrice(order.productsTotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>Livraison</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </p>
            <p className="flex justify-between font-heading text-base">
              <span>Total</span>
              <span>{formatPrice(order.orderTotal)}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-encre/50">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
