import Link from "next/link";
import { OrdersSearch } from "@/components/admin/OrdersSearch";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";
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
      <p className={`${M} text-[11px] tracking-[.14em] uppercase opacity-70`}>Registre</p>
      <h1 className={`${G} mt-2 text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[52px]`}>
        Commandes.
      </h1>

      <div className={`${M} mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b pb-3 text-[11px] tracking-[.12em] uppercase`} style={{ borderColor: `${ENCRE}33` }}>
        <Onglet label="Toutes" nombre={toutes.length} href="/admin/commandes" actif={!status} />
        {ORDER_STATUSES.map((s) => (
          <Onglet
            key={s}
            label={s}
            nombre={toutes.filter((o) => o.status === s).length}
            href={`/admin/commandes?status=${encodeURIComponent(s)}`}
            actif={status === s}
          />
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 opacity-60">
          {status ? `Aucune commande « ${status} ».` : "Aucune commande pour le moment."}
        </p>
      ) : (
        <OrdersSearch orders={orders} />
      )}
    </div>
  );
}

function Onglet({
  label,
  nombre,
  href,
  actif,
}: {
  label: string;
  nombre: number;
  href: string;
  actif: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`inline-flex items-baseline gap-1.5 capitalize transition hover:opacity-100 ${
        actif ? "underline decoration-2 underline-offset-[6px]" : "opacity-65"
      }`}
      style={actif ? { textDecorationColor: ROUGE } : undefined}
    >
      {label}
      <span className="text-[10px] opacity-60">{nombre}</span>
    </Link>
  );
}
