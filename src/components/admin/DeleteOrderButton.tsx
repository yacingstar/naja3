"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { deleteOrder } from "@/app/admin/(espace)/commandes/actions";
import { ENCRE, G, M, ROUGE } from "@/components/serie/style";

// Supprimer une commande est sans retour : ni corbeille, ni journal. Le bouton
// n'ouvre donc pas une boîte `confirm()` qu'on balaie d'un clic — il déplie un
// avertissement qui écrit ce qu'on s'apprête à perdre, avec le nom de la
// personne et le montant, et il faut viser un second bouton pour aller au bout.
//
// L'alternative est rappelée sur place, parce que c'est presque toujours celle
// qu'on veut : passer la commande en « annulée » la sort des ventes tout en
// gardant la trace.
export function DeleteOrderButton({
  orderId,
  client,
  montant,
}: {
  orderId: number;
  client: string;
  montant: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  function supprimer() {
    setErreur(null);
    startTransition(async () => {
      const r = await deleteOrder(orderId);
      if (!r.ok) {
        setErreur(r.error);
        return;
      }
      router.push("/admin/commandes");
      router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <AdminButton variant="ghost" size="sm" onClick={() => setOuvert(true)}>
        Supprimer cette commande
      </AdminButton>
    );
  }

  return (
    <div className="border-l-[3px] py-1 pl-4" style={{ borderColor: ROUGE }}>
      <p className={`${G} text-[17px] font-semibold`}>Supprimer la commande #{orderId} ?</p>
      <p className="mt-1 max-w-[52ch] text-[14px] opacity-80">
        {client} — {montant}. Cette commande et ses articles seront effacés
        définitivement, et retirés des chiffres de l&apos;accueil. Il n&apos;y a pas de
        retour en arrière.
      </p>
      <p className={`${M} mt-2 max-w-[52ch] text-[11px] tracking-[.05em] opacity-70`}>
        Si la commande n&apos;aboutit pas, passez-la plutôt en « annulée » : elle sort
        des ventes et la trace reste.
      </p>
      {erreur ? (
        <p className={`${M} mt-3 text-[11px] uppercase`} style={{ color: ROUGE }}>
          {erreur}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          className={`${M} px-5 py-3 text-[11px] tracking-[.12em] text-[#f6efe1] uppercase transition hover:opacity-90 disabled:opacity-60`}
          style={{ background: ROUGE }}
        >
          {enCours ? "Suppression…" : "Oui, supprimer définitivement"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          disabled={enCours}
          className={`${M} text-[11px] tracking-[.12em] uppercase underline underline-offset-4 opacity-70 transition hover:opacity-100`}
          style={{ color: ENCRE }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
