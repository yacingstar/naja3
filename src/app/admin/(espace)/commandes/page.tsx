import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/format";
import { getOrders, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

export default async function CommandesPage({
  searchParams,
}: PageProps<"/admin/commandes">) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status = statusParam && isOrderStatus(statusParam) ? statusParam : undefined;

  const orders = await getOrders(status);

  return (
    <div>
      <h1 className="font-heading text-2xl">Commandes</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab label="Toutes" href="/admin/commandes" active={!status} />
        {ORDER_STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={s}
            href={`/admin/commandes?status=${encodeURIComponent(s)}`}
            active={status === s}
          />
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 text-encre/60">Aucune commande pour le moment.</p>
      ) : (
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-encre/10 text-left text-encre/50">
              <th className="py-2 pr-4 font-medium">N°</th>
              <th className="py-2 pr-4 font-medium">Client</th>
              <th className="py-2 pr-4 font-medium">Wilaya</th>
              <th className="py-2 pr-4 font-medium">Total</th>
              <th className="py-2 pr-4 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-encre/5">
                <td className="py-3 pr-4">
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="font-medium hover:text-lueur"
                  >
                    #{order.id}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  {order.customerFirstName} {order.customerLastName}
                </td>
                <td className="py-3 pr-4">{order.wilaya}</td>
                <td className="py-3 pr-4">{formatPrice(order.orderTotal)}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
        active
          ? "border-encre bg-encre text-papier"
          : "border-encre/20 hover:border-encre"
      }`}
    >
      {label}
    </Link>
  );
}
