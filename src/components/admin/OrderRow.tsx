import Link from "next/link";
import { PreparedCheckbox } from "@/components/admin/PreparedCheckbox";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LampMark } from "@/components/LampMark";
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
//
// La deuxième ligne — le contenu de la commande — est la demande de la
// patronne : « ça va beaucoup me faciliter quand je suis en train de préparer
// leurs commandes ». C'est exactement le geste qu'elle décrit. Préparer une
// commande demande de savoir quoi imprimer et dans quelle teinte, et il fallait
// auparavant ouvrir chaque commande l'une après l'autre puis revenir en
// arrière. La liste est l'écran de préparation, pas l'index.
//
// Elle occupe toute la largeur SOUS la ligne d'identité plutôt que d'être
// glissée dans la colonne du nom : cette colonne fait la largeur d'un pouce sur
// un téléphone, et trois articles y tiendraient sur six lignes. Ici ils
// s'étalent, et la ligne garde la même hauteur sur mobile et sur écran large.
//
// Les types sont écrits sur place plutôt qu'importés de `lib/orders` : ce
// fichier est rendu dans un composant client (OrdersSearch), et `lib/orders`
// tire le client Supabase serveur. Un import de type disparaît à la
// compilation, mais la forme locale évite d'avoir à s'en souvenir.
export function OrderRow({
  order,
}: {
  order: {
    id: number;
    createdAt: string;
    customerFirstName: string;
    customerLastName: string;
    wilaya: string;
    commune: string;
    orderTotal: number;
    status: OrderStatus;
    preparedAt: string | null;
    preparationAvailable: boolean;
    items: Array<{
      productName: string;
      colorName: string;
      colorHex: string | null;
      colorHex2: string | null;
      quantity: number;
    }>;
  };
}) {
  return (
    <li className="rounded-2xl border-2 border-encre/12">
      <Link
        href={`/admin/commandes/${order.id}`}
        className="block rounded-2xl border-2 border-encre/12 px-4 py-3 transition hover:border-encre/40 hover:bg-encre/[.03]"
      >
        <span className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[3.5rem_1fr_8rem_7rem_7.5rem]">
          <span className="font-heading text-base font-semibold">#{order.id}</span>

          {/* Plus de `truncate` depuis que la commune est là : la couper à
              l'écran serait pire que de ne pas l'afficher du tout, parce qu'on
              croirait l'avoir lue. La ligne s'allonge ou passe à la ligne. */}
          <span className="min-w-0 font-medium">
            {order.customerFirstName} {order.customerLastName}
            <span className="text-encre/55"> · {order.wilaya}</span>
            {order.commune ? <span className="text-encre/55"> — {order.commune}</span> : null}
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
        </span>

        {order.items.length > 0 ? (
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-encre/10 pt-2">
            {order.items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {/* La même pastille que le configurateur de l'accueil, les
                    pastilles de la fiche produit et les réglages de l'admin :
                    une veilleuse dessinée, teintée de sa couleur — et pour une
                    bicolore, l'abat-jour d'une teinte et le pied de l'autre.
                    C'est ce qu'elle a sous les yeux quand elle choisit la
                    bobine, donc c'est ce qui doit être dans la liste. */}
                <LampMark hex={item.colorHex} hex2={item.colorHex2} className="h-5 w-5 shrink-0" />
                <span className="text-[13px] font-medium whitespace-nowrap text-encre/80">
                  {item.quantity} × {item.productName}
                  {item.colorName ? (
                    <span className="text-encre/55"> · {item.colorName}</span>
                  ) : null}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </Link>
      {order.status !== "expédiée" && order.status !== "livrée" && order.status !== "annulée" ? (
        <PreparedCheckbox orderId={order.id} preparedAt={order.preparedAt} available={order.preparationAvailable} />
      ) : null}
    </li>
  );
}
