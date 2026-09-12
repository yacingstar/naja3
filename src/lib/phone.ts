// Algerian phone numbers, normalised to international digits-only form:
// country code + subscriber number, no leading zero and no punctuation.
//
//   0555 12 34 56  ->  213555123456
//
// Lives here rather than beside either caller because two of them need the
// exact same transform for different reasons, and a second copy would be free
// to drift: `lib/meta/capi.ts` hashes the result for Meta's advanced matching
// (a wrong normalisation there produces a 0% match rate, never an error), and
// `lib/notify/telegram.ts` builds a wa.me link from it (a wrong one produces a
// dead link). Neither failure announces itself, so there is exactly one copy.
//
// The order form already enforces /^0[0-9]{8,9}$/, so the 00-prefix and
// already-has-213 branches are defensive — a phone typed as +213... or
// 00213... would otherwise become 21300213... and match nobody.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return "";
  if (digits.startsWith("213")) return digits;
  return `213${digits.replace(/^0+/, "")}`;
}
