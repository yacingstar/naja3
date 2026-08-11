const priceFormatter = new Intl.NumberFormat("fr-FR");

// Amounts are integer DZD, no cents — format everywhere through this
// instead of reimplementing Intl.NumberFormat calls.
export function formatPrice(amount: number): string {
  return `${priceFormatter.format(amount)} DA`;
}
