const priceFormatter = new Intl.NumberFormat("fr-FR");

// Amounts are integer DZD, no cents — format everywhere through this
// instead of reimplementing Intl.NumberFormat calls.
export function formatPrice(amount: number): string {
  return `${priceFormatter.format(amount)} DA`;
}

// Postgres hands back `created_at` as UTC, but the only person reading it is
// the admin, in Algeria. Both the locale and the time zone are pinned rather
// than left to the host: Netlify's functions run in UTC, so an order placed at
// 00:30 Algiers time would otherwise be dated to the previous day. Pinning has
// a second payoff — server and client renders produce the same string, so
// React never sees a hydration mismatch (OrderRow is a Client Component).
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Africa/Algiers",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Algiers",
});

// "12 février 2026 à 14:30" — detail screens, where there's room to breathe.
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

// "12 févr. 2026, 14:30" — the orders table, where there isn't.
export function formatDateTimeShort(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}
