// Split out from orders.ts (which imports the server-only Supabase client)
// so Client Components can import just the type/constant without pulling
// next/headers into the browser bundle.
export type OrderStatus = "nouvelle" | "confirmée" | "expédiée" | "livrée" | "annulée";

export const ORDER_STATUSES: OrderStatus[] = [
  "nouvelle",
  "confirmée",
  "expédiée",
  "livrée",
  "annulée",
];
