"use client";

import { useMemo, useState } from "react";
import { OrderRow } from "@/components/admin/OrderRow";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";
import type { OrderListItem } from "@/lib/orders";

// La recherche dans le registre.
//
// Elle filtre la liste déjà chargée, en mémoire : aucune requête, aucun
// rechargement, le résultat arrive à la frappe. À quelques centaines de
// commandes c'est instantané, et ça évite d'ajouter un index et une route à
// maintenir pour un besoin qui se résume à « retrouver Amine ».
//
// On cherche sur ce qu'on a sous les yeux quand le téléphone sonne : le nom,
// la wilaya, la commune et le numéro de commande. Les accents et la casse sont
// ignorés — « zerrouki » doit trouver « ZERROUKI », et « bejaia » « Béjaïa ».
function nu(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function OrdersSearch({ orders }: { orders: OrderListItem[] }) {
  const [q, setQ] = useState("");

  const resultats = useMemo(() => {
    const terme = nu(q.trim());
    if (!terme) return orders;
    return orders.filter((o) =>
      nu(`${o.customerFirstName} ${o.customerLastName} ${o.wilaya} #${o.id} ${o.id}`).includes(terme),
    );
  }, [orders, q]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un nom, une wilaya, un numéro…"
          aria-label="Chercher une commande"
          className={`${M} max-w-sm min-w-0 flex-1 border-b bg-transparent py-2 text-[12px] outline-none placeholder:opacity-45 focus:border-b-2`}
          style={{ borderColor: q ? ROUGE : `${ENCRE}44` }}
        />
        {q ? (
          <p className={`${M} text-[10px] tracking-[.12em] uppercase opacity-70`}>
            {resultats.length} résultat{resultats.length === 1 ? "" : "s"}
            <button
              type="button"
              onClick={() => setQ("")}
              className="ml-3 underline underline-offset-4 transition hover:opacity-70"
            >
              Effacer
            </button>
          </p>
        ) : null}
      </div>

      {resultats.length === 0 ? (
        <p className={`${G} mt-10 text-[17px] font-semibold opacity-60`}>
          Aucune commande ne correspond à « {q} ».
        </p>
      ) : (
        <ul className="mt-2">
          {resultats.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
