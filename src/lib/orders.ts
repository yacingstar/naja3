import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orderStatus";

export { ORDER_STATUSES, type OrderStatus };

/** Ce qu'il y a dans une commande, tel que la liste en a besoin. */
export type OrderItemSummary = {
  productName: string;
  colorName: string;
  // Les deux teintes, pour dessiner la pastille. Une veilleuse bicolore a sa
  // nuance d'abat-jour et sa nuance de pied — voir LampMark.
  colorHex: string | null;
  colorHex2: string | null;
  quantity: number;
};

export type OrderListItem = {
  id: number;
  createdAt: string;
  status: OrderStatus;
  customerFirstName: string;
  customerLastName: string;
  wilaya: string;
  // La commune, à côté de la wilaya. La wilaya dit où c'est en gros, la commune
  // dit où c'est vraiment — et c'est la commune qu'on lit au moment de préparer
  // le colis.
  commune: string;
  orderTotal: number;
  // Le contenu de la commande, dans la LISTE et pas seulement sur la fiche.
  //
  // C'est la demande de la patronne, et elle vient d'un vrai geste de travail :
  // préparer une commande demande de savoir quoi imprimer et dans quelle
  // couleur, et il fallait jusqu'ici ouvrir chaque commande l'une après
  // l'autre, puis revenir en arrière. La liste EST l'écran de préparation.
  items: OrderItemSummary[];
  preparedAt: string | null;
  preparationAvailable: boolean;
};

/**
 * Au-delà, une commande encore au statut « nouvelle » a été oubliée.
 *
 * Sept jours, et c'est le délai maximum que la boutique s'engage à tenir, dit
 * par la patronne elle-même. Le seuil était à deux jours au moment d'écrire
 * cette page ; il a été porté à sept parce que deux jours signalaient comme un
 * problème du travail parfaitement normal — et un signal qui crie pour rien
 * finit par être ignoré, ce qui est pire que pas de signal du tout.
 */
export const RETARD_MS = 7 * 86_400_000;

/**
 * Les commandes qui attendent une réponse depuis trop longtemps.
 *
 * Ici et pas dans la page, pour deux raisons : c'est une règle sur les
 * commandes, pas une règle d'affichage ; et lire l'horloge pendant le rendu
 * d'un composant est refusé par la règle de pureté de React
 * (`react-hooks/purity`), à juste titre — un rendu doit pouvoir être rejoué
 * sans changer de résultat.
 */
export function commandesEnRetard(orders: OrderListItem[]): OrderListItem[] {
  const maintenant = Date.now();
  return orders.filter(
    (o) => o.status === "nouvelle" && maintenant - new Date(o.createdAt).getTime() > RETARD_MS,
  );
}

type OrderListRow = {
  prepared_at?: string | null;
  id: number;
  created_at: string;
  status: OrderStatus;
  customer_first_name: string;
  customer_last_name: string;
  wilaya: string;
  commune: string;
  order_total: number;
  order_items: Array<{
    quantity: number;
    products: { name: string } | null;
    product_colors: { color_name: string; color_hex: string | null; color_hex_2: string | null } | null;
  }>;
};

export async function getOrders(status?: OrderStatus): Promise<OrderListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      // Sans espaces dans les parenthèses imbriquées : PostgREST refuse
      // « order_items ( … ) » dès qu'il y a un deuxième niveau (PGRST100).
      "*,order_items(quantity,products(name),product_colors(color_name,color_hex,color_hex_2))",
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query.returns<OrderListRow[]>();
  if (error || !data) return [];

  return data.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    status: order.status,
    customerFirstName: order.customer_first_name,
    customerLastName: order.customer_last_name,
    wilaya: order.wilaya,
    commune: order.commune,
    orderTotal: order.order_total,
    preparedAt: order.prepared_at ?? null,
    preparationAvailable: Object.prototype.hasOwnProperty.call(order, "prepared_at"),
    items: (order.order_items ?? []).map((item) => ({
      productName: item.products?.name ?? "(veilleuse supprimée)",
      colorName: item.product_colors?.color_name ?? "",
      colorHex: item.product_colors?.color_hex ?? null,
      colorHex2: item.product_colors?.color_hex_2 ?? null,
      quantity: item.quantity,
    })),
  }));
}

export type OrderDetail = {
  id: number;
  createdAt: string;
  status: OrderStatus;
  customerFirstName: string;
  customerLastName: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryMethod: "domicile" | "stopdesk";
  deliveryFee: number;
  productsTotal: number;
  orderTotal: number;
  notesClient: string | null;
  internalNotes: string | null;
  items: Array<{
    id: number;
    productName: string;
    colorName: string;
    quantity: number;
    priceAtOrder: number;
  }>;
};

type OrderItemRow = {
  id: number;
  quantity: number;
  price_at_order: number;
  products: { name: string } | null;
  product_colors: { color_name: string } | null;
};

export async function getOrderById(id: number): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, price_at_order, products ( name ), product_colors ( color_name )")
    .eq("order_id", id)
    .returns<OrderItemRow[]>();

  return {
    id: order.id,
    createdAt: order.created_at,
    status: order.status,
    customerFirstName: order.customer_first_name,
    customerLastName: order.customer_last_name,
    phone: order.phone,
    wilaya: order.wilaya,
    commune: order.commune,
    deliveryMethod: order.delivery_method,
    deliveryFee: order.delivery_fee,
    productsTotal: order.products_total,
    orderTotal: order.order_total,
    notesClient: order.notes_client,
    internalNotes: order.internal_notes,
    items: (items ?? []).map((item) => ({
      id: item.id,
      productName: item.products?.name ?? "(produit supprimé)",
      colorName: item.product_colors?.color_name ?? "(couleur supprimée)",
      quantity: item.quantity,
      priceAtOrder: item.price_at_order,
    })),
  };
}
