// The order payload both notifiers send — Telegram and WhatsApp.
//
// Extracted from telegram.ts when WhatsApp was added, for the same reason
// `normalizePhone` was extracted in the thirty-first round: two call sites that
// must agree about one shape, and a second copy would be free to drift. The two
// senders are otherwise deliberately independent — they share this type and
// nothing else, so either can be deleted without touching the other.
//
// Deliberately type-only, with no `server-only`: it carries no credentials and
// no runtime code, so importing it never pulls one notifier into the other.
export type NewOrderNotification = {
  orderId: number;
  firstName: string;
  lastName: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryMethod: "domicile" | "stopdesk";
  note: string;
  deliveryFee: number;
  productsTotal: number;
  orderTotal: number;
  items: Array<{
    productName: string;
    colorName: string;
    quantity: number;
    price_at_order: number;
  }>;
};
