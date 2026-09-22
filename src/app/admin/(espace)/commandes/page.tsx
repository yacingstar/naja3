import Link from "next/link";
import { OrderRow } from "@/components/admin/OrderRow";
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

  // Une seule lecture, filtrée ensuite en mémoire, au lieu d'une requête par
  // statut : c'est ce qui permet d'écrire le nombre sur chaque onglet. Sans ce
  // nombre, il fallait cliquer sur « expédiée » pour découvrir qu'il n'y avait
  // rien dedans. Naïf mais honnête à cette échelle — voir la note de
  // /admin/page.tsx.
  const toutes = await getOrders();
  const orders = status ? toutes.filter((o) => o.status === status) : toutes;

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[48px]">
        Commandes
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab label="Toutes" nombre={toutes.length} href="/admin/commandes" active={!status} />
        {ORDER_STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={s}
            nombre={toutes.filter((o) => o.status === s).length}
            href={`/admin/commandes?status=${encodeURIComponent(s)}`}
            active={status === s}
          />
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 font-medium text-encre/60">
          {status ? `Aucune commande « ${status} ».` : "Aucune commande pour le moment."}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  label,
  nombre,
  href,
  active,
}: {
  label: string;
  nombre: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-semibold capitalize transition ${
        active
          ? "border-encre bg-encre text-papier"
          : "border-encre/15 text-encre/70 hover:border-encre/40 hover:text-encre"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-xs ${
          active ? "bg-papier/20" : "bg-encre/8"
        }`}
      >
        {nombre}
      </span>
    </Link>
  );
}
