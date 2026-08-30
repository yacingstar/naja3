"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders";

// Opening an order used to mean clicking the "#12" — the one bit of the row a
// non-technical person would never guess was the button. The whole row is the
// target now, with a hover highlight so it looks clickable and an explicit
// "Ouvrir →" at the end so nobody has to guess at all.
//
// The real <Link> stays: it is what makes this keyboard-reachable and
// right-clickable / open-in-new-tab. The row click is an addition on top, not
// a replacement for it.
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
  const router = useRouter();
  const href = `/admin/commandes/${order.id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer border-b border-encre/5 transition-colors hover:bg-lueur/10"
    >
      <td className="py-3 pr-4">
        <Link
          href={href}
          // The row already navigates; without this the click would fire twice.
          onClick={(e) => e.stopPropagation()}
          className="font-medium hover:text-lueur"
        >
          #{order.id}
        </Link>
      </td>
      <td className="py-3 pr-4 whitespace-nowrap text-encre/70">
        <time dateTime={order.createdAt}>{formatDateTimeShort(order.createdAt)}</time>
      </td>
      <td className="py-3 pr-4">
        {order.customerFirstName} {order.customerLastName}
      </td>
      <td className="py-3 pr-4">{order.wilaya}</td>
      <td className="py-3 pr-4">{formatPrice(order.orderTotal)}</td>
      <td className="py-3 pr-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="py-3 pr-4 text-right">
        <span aria-hidden className="text-sm font-medium whitespace-nowrap text-encre/40">
          Ouvrir →
        </span>
      </td>
    </tr>
  );
}
