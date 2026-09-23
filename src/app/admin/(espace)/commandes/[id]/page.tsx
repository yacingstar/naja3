import { notFound } from "next/navigation";
import Link from "next/link";
import { InternalNotesForm } from "@/components/admin/InternalNotesForm";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getOrderById } from "@/lib/orders";

// La page de traitement d'une commande. Deux blocs cerclés : à gauche qui
// commande et comment la joindre, à droite ce qu'elle a commandé et combien le
// livreur doit encaisser.
//
// Le numéro de téléphone est devenu un lien `tel:`. C'est le geste que cette
// page sert à faire — appeler pour confirmer — et depuis un téléphone il
// fallait jusqu'ici sélectionner le numéro à la main pour le recopier.
export default async function CommandeDetailPage({
  params,
}: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;
  const orderId = Number(id);
  const order = Number.isFinite(orderId) ? await getOrderById(orderId) : null;

  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/commandes"
        className="text-sm font-semibold text-encre/60 transition hover:text-encre"
      >
        ← Toutes les commandes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[38px] leading-none font-bold tracking-[-.03em] sm:text-[44px]">
            Commande #{order.id}
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <OrderStatusControl orderId={order.id} status={order.status} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border-[3px] border-encre p-5 sm:p-6">
          <h2 className="font-heading text-xl font-semibold">Client</h2>
          <dl className="mt-3.5 space-y-1.5 text-sm">
            <Row label="Reçue le">
              <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
            </Row>
            <Row label="Nom">
              {order.customerFirstName} {order.customerLastName}
            </Row>
            <Row label="Téléphone">
              <a
                href={`tel:${order.phone.replace(/\s/g, "")}`}
                className="font-heading text-base underline decoration-encre/25 underline-offset-4 transition hover:decoration-encre"
              >
                {order.phone}
              </a>
            </Row>
            <Row label="Adresse">
              {order.commune}, {order.wilaya}
            </Row>
            <Row label="Livraison">
              {order.deliveryMethod === "domicile" ? "À domicile" : "Stopdesk"} —{" "}
              {formatPrice(order.deliveryFee)}
            </Row>
            {order.notesClient ? <Row label="Note du client">{order.notesClient}</Row> : null}
          </dl>

          <h2 className="mt-7 font-heading text-xl font-semibold">Note interne</h2>
          <p className="mt-1 text-[13px] font-medium text-encre/55">
            Pour vous seulement — jamais visible par la cliente ou le client.
          </p>
          <div className="mt-3">
            <InternalNotesForm orderId={order.id} initialNotes={order.internalNotes} />
          </div>
        </section>

        <section className="rounded-[1.75rem] border-[3px] border-encre p-5 sm:p-6">
          <h2 className="font-heading text-xl font-semibold">Articles</h2>
          <ul className="mt-3.5 divide-y-2 divide-encre/10 border-y-2 border-encre/10 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <span className="font-medium">
                  {item.quantity} × {item.productName}{" "}
                  <span className="text-encre/60">({item.colorName})</span>
                </span>
                <span className="whitespace-nowrap">
                  {formatPrice(item.priceAtOrder * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-encre/65">Sous-total</span>
              <span>{formatPrice(order.productsTotal)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-encre/65">Livraison</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </p>
            <p className="mt-1 flex justify-between border-t-2 border-encre/15 pt-2.5 font-heading text-xl font-semibold">
              <span>À encaisser</span>
              <span>{formatPrice(order.orderTotal)}</span>
            </p>
          </div>
        </section>
      </div>

      {/* Tout en bas, et derriere un avertissement : c'est le seul geste de
          l'admin qui ne se repare pas. */}
      <div className="mt-14 border-t-2 border-dashed border-encre/15 pt-6">
        <DeleteOrderButton
          orderId={order.id}
          client={`${order.customerFirstName} ${order.customerLastName}`}
          montant={formatPrice(order.orderTotal)}
        />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 font-medium text-encre/55">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
