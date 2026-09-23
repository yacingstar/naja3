import { M, RISO } from "@/components/serie/style";
import type { OrderStatus } from "@/lib/orderStatus";

// Des étiquettes de risographie : un rectangle d'encre pâle, le mot en
// machine à écrire par-dessus. Jamais la couleur seule — le mot est toujours
// écrit, parce qu'une teinte ne se lit pas.
//
// L'ordre suit la vie d'une commande : elle arrive (bleu), elle est confirmée
// (olive), elle part (rose), elle arrive chez la cliente (encre pleine).
// Annulée est la seule sans couleur, et barrée.
const STYLES: Record<OrderStatus, { fond: string; texte: string; barre?: boolean }> = {
  nouvelle: { fond: RISO[0].tag, texte: RISO[0].texte },
  confirmée: { fond: RISO[3].tag, texte: RISO[3].texte },
  expédiée: { fond: RISO[2].tag, texte: RISO[2].texte },
  livrée: { fond: "#1d1a17", texte: "#f6efe1" },
  annulée: { fond: "transparent", texte: "rgba(29,26,23,.5)", barre: true },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`${M} inline-block px-2 py-1 text-[10px] tracking-[.12em] uppercase ${
        s.barre ? "line-through" : ""
      }`}
      style={{
        background: s.fond,
        color: s.texte,
        boxShadow: s.barre ? "inset 0 0 0 1px rgba(29,26,23,.28)" : undefined,
      }}
    >
      {status}
    </span>
  );
}
