import type { OrderStatus } from "@/lib/orderStatus";

// Avoid default red/green — each status gets a distinct brand color instead.
const STYLES: Record<OrderStatus, string> = {
  nouvelle: "bg-crepuscule/20 text-crepuscule",
  confirmée: "bg-lueur/25 text-encre",
  expédiée: "bg-sauge/30 text-encre",
  livrée: "bg-encre text-papier",
  annulée: "bg-blush/60 text-encre/60",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
