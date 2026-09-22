import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTimeShort, formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/orderStatus";

// Une ligne de commande, et non plus un `<tr>`.
//
// Le tableau tenait sept colonnes et défilait latéralement sur un téléphone —
// or c'est depuis un téléphone que les commandes se traitent. Ici la ligne se
// replie toute seule : empilée sur un écran étroit, alignée en colonnes dès
// qu'il y a la place.
//
// C'est aussi devenu un simple lien, sans `router.push` sur la ligne entière.
// L'ancien composant plaçait un `onClick` sur le `<tr>` et devait annuler la
// propagation du lien interne pour ne pas naviguer deux fois. Un seul lien qui
// couvre toute la ligne fait la même chose, en restant ouvrable dans un nouvel
// onglet et atteignable au clavier sans rien de spécial.
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
        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-2xl border-2 border-encre/12 px-4 py-3 transition hover:border-encre/40 hover:bg-encre/[.03] sm:grid-cols-[3.5rem_1fr_8rem_7rem_7.5rem]"
      >
        <span className="font-heading text-base font-semibold">#{order.id}</span>

        <span className="min-w-0 truncate font-medium">
          {order.customerFirstName} {order.customerLastName}
          <span className="text-encre/55"> · {order.wilaya}</span>
        </span>

        {/* Le statut passe en tête de ligne sur téléphone (3e colonne de la
            grille étroite) et reprend sa place à droite dès qu'il y a la
            largeur. */}
        <span className="justify-self-end sm:order-last">
          <StatusBadge status={order.status} />
        </span>

        <time
          dateTime={order.createdAt}
          className="col-span-2 text-[13px] font-medium whitespace-nowrap text-encre/50 sm:col-span-1"
        >
          {formatDateTimeShort(order.createdAt)}
        </time>

        <span className="justify-self-end font-heading text-base whitespace-nowrap sm:justify-self-start">
          {formatPrice(order.orderTotal)}
        </span>
      </Link>
    </li>
  );
}
