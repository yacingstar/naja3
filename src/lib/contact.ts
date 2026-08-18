// ─── EDIT ME ────────────────────────────────────────────────────────────
// The shop's real contact destinations, in one place because the header,
// the footer and the trust strip all want them.
//
// Every entry is `null` until we actually have one, and nothing here is
// invented: a dead Instagram link — or worse, one pointing at a handle that
// belongs to somebody else — is worse than no link. Fill a value in and the
// matching UI (header icon, footer row) appears on its own; leave it null
// and that UI is simply not rendered.
//
//   whatsapp:  international format, no + or spaces   e.g. "213555123456"
//   instagram: handle without the @                   e.g. "naja.dz"
//   email:     plain address                          e.g. "bonjour@naja.dz"
// ────────────────────────────────────────────────────────────────────────
export const CONTACT: {
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
} = {
  whatsapp: null,
  instagram: null,
  email: null,
};

export const instagramUrl = CONTACT.instagram
  ? `https://instagram.com/${CONTACT.instagram}`
  : null;

// Pre-filled so the customer doesn't have to compose the first message —
// the thing that most often stops someone messaging at all. Callers on a
// product page pass their own text with the lamp's name in it.
export function whatsappUrl(message?: string): string | null {
  if (!CONTACT.whatsapp) return null;
  const base = `https://wa.me/${CONTACT.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const emailUrl = CONTACT.email ? `mailto:${CONTACT.email}` : null;

// Footer's "Nous écrire" column, in display order.
export const CONTACT_LINKS = [
  whatsappUrl("Bonjour ! J'ai une question à propos de vos lampes.") && {
    label: "WhatsApp",
    href: whatsappUrl("Bonjour ! J'ai une question à propos de vos lampes.")!,
  },
  instagramUrl && { label: "Instagram", href: instagramUrl },
  emailUrl && { label: CONTACT.email!, href: emailUrl },
].filter(Boolean) as Array<{ label: string; href: string }>;
