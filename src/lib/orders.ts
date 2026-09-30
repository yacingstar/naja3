import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orderStatus";

export { ORDER_STATUSES, type OrderStatus };

export type OrderListItem = {
  id: number;
  createdAt: string;
  status: OrderStatus;
  customerFirstName: string;
  customerLastName: string;
  wilaya: string;
  orderTotal: number;
};

/** Au-delà, une commande encore au statut « nouvelle » a été oubliée. */
export const RETARD_MS = 2 * 86_400_000;

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

export async function getOrders(status?: OrderStatus): Promise<OrderListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, created_at, status, customer_first_name, customer_last_name, wilaya, order_total",
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    status: order.status,
    customerFirstName: order.customer_first_name,
    customerLastName: order.customer_last_name,
    wilaya: order.wilaya,
    orderTotal: order.order_total,
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
