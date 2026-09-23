import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/orderStatus";

// Une ligne de commande, comme une ligne de registre : le numéro en rouge, le
// nom, la date en machine à écrire, le montant aligné à droite.
//
// Ce n'est pas un tableau. Les sept colonnes défilaient latéralement sur un
// téléphone — or c'est depuis un téléphone que les commandes se traitent. Ici
// la ligne se replie toute seule et se déplie dès qu'il y a la place.
export function OrderRow({
  order,
}: {
  order: {
    id: number;
    createdAt: string;
    customerFirstName: string;
    customerLastName: string;
    wilaya: string;
    orderTotal: number;
    status: OrderStatus;
  };
}) {
  return (
    <li>
      <Link
        href={`/admin/commandes/${order.id}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1.5 border-b py-3.5 transition-colors hover:bg-[#1d1a17]/[.04] sm:grid-cols-[3.5rem_1fr_8rem_7rem_7.5rem]"
        style={{ borderColor: `${ENCRE}26` }}
      >
        <span className={`${M} text-[11px]`} style={{ color: ROUGE }}>
          #{order.id}
        </span>

        <span className="min-w-0 truncate">
          <span className={`${G} text-[16px] font-semibold`}>
            {order.customerFirstName} {order.customerLastName}
          </span>
          <span className={`${M} ml-2 text-[11px] opacity-60`}>{order.wilaya}</span>
        </span>

        {/* Le statut passe en tête de ligne sur téléphone et reprend sa place à
            droite dès qu'il y a la largeur. */}
        <span className="justify-self-end sm:order-last">
          <StatusBadge status={order.status} />
        </span>

        <time
          dateTime={order.createdAt}
          className={`${M} col-span-2 text-[11px] whitespace-nowrap opacity-55 sm:col-span-1`}
        >
          {formatDateTimeShort(order.createdAt)}
        </time>

        <span className={`${G} justify-self-end text-[16px] font-semibold whitespace-nowrap tabular-nums sm:justify-self-start`}>
          {formatPrice(order.orderTotal)}
        </span>
      </Link>
    </li>
  );
}
