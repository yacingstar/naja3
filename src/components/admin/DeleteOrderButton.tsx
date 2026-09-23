"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { deleteOrder } from "@/app/admin/(espace)/commandes/actions";

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
    <div className="rounded-[1.5rem] border-[3px] border-encre bg-[#ff9ec7] p-5">
      <p className="font-heading text-xl font-semibold">Supprimer la commande #{orderId} ?</p>
      <p className="mt-2 max-w-[52ch] text-[15px] font-medium">
        {client} — {montant}. Cette commande et ses articles seront effacés
        définitivement, et retirés des chiffres de l&apos;accueil. Il n&apos;y a pas
        de retour en arrière.
      </p>
      <p className="mt-2 max-w-[52ch] text-[14px] font-medium text-encre/75">
        Si la commande n&apos;aboutit pas, passez-la plutôt en « annulée » : elle sort
        des ventes et la trace reste.
      </p>
      {erreur ? <p className="mt-3 font-heading text-sm text-red-800">{erreur}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          className="rounded-full bg-encre px-6 py-3 font-heading text-base text-papier shadow-[0_6px_0_-1px_rgba(36,28,33,.35)] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
        >
          {enCours ? "Suppression…" : "Oui, supprimer définitivement"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          disabled={enCours}
          className="font-heading text-base underline underline-offset-4 transition hover:opacity-70"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
