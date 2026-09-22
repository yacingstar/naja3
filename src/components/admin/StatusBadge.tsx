import type { OrderStatus } from "@/lib/orderStatus";

// Pastilles cerclées de noir, comme partout ailleurs sur le site. Les fonds
// sont ceux de la palette de l'accueil et de la boutique, pas des rouges et
// des verts d'interface — et surtout jamais la couleur seule pour porter
// l'information : le mot est toujours écrit.
//
// L'ordre suit le cycle d'une commande : elle arrive (jaune), elle est
// confirmée (vert d'eau), elle part (bleu), elle arrive chez le client (noir
// plein, c'est fini). Annulée est la seule sans couleur.
const STYLES: Record<OrderStatus, string> = {
  nouvelle: "border-encre bg-[#ffd166] text-encre",
  confirmée: "border-encre bg-[#8ad4c1] text-encre",
  expédiée: "border-encre bg-[#7fd4ee] text-encre",
  livrée: "border-encre bg-encre text-papier",
  annulée: "border-encre/25 bg-papier text-encre/50 line-through",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full border-2 px-3 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
