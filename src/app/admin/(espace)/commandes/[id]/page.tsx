import { notFound } from "next/navigation";
import Link from "next/link";
import { InternalNotesForm } from "@/components/admin/InternalNotesForm";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";
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
        className={`${M} text-[11px] tracking-[.12em] uppercase underline underline-offset-4 opacity-70 transition hover:opacity-100`}
      >
        ← Toutes les commandes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={`${G} text-[36px] leading-none font-bold tracking-[-.03em] sm:text-[44px]`}>
            Commande <span style={{ color: ROUGE }}>#{order.id}</span>
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <OrderStatusControl orderId={order.id} status={order.status} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <section className="border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
          <h2 className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>01 — Client</h2>
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
                className={`${G} text-[17px] font-semibold underline decoration-[#1d1a17]/30 underline-offset-4 transition hover:decoration-[#1d1a17]`}
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

          <h2 className={`${M} mt-8 border-t pt-5 text-[11px] tracking-[.14em] uppercase opacity-70`} style={{ borderColor: `${ENCRE}33` }}>
            Note interne
          </h2>
          <p className="mt-2 text-[13px] opacity-65">
            Pour vous seulement — jamais visible par la cliente ou le client.
          </p>
          <div className="mt-3">
            <InternalNotesForm orderId={order.id} initialNotes={order.internalNotes} />
          </div>
        </section>

        <section className="border-t pt-5" style={{ borderColor: `${ENCRE}33` }}>
          <h2 className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>02 — Articles</h2>
          <ul className="mt-4 divide-y divide-[#1d1a17]/15 border-y border-[#1d1a17]/15 text-sm">
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
            <p className={`${G} mt-2 flex justify-between border-t pt-3 text-[22px] font-bold tabular-nums`} style={{ borderColor: `${ENCRE}33` }}>
              <span>À encaisser</span>
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
      <dt className={`${M} shrink-0 text-[10px] tracking-[.1em] uppercase opacity-60`}>{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
