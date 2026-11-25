// Splitting one admin-written description into the two slots a landing page
// has for it, instead of adding a second description column the shop owner
// would have to keep in sync with the first.
//
// Every description in the catalogue is a single paragraph of three to five
// sentences that follows the same shape: what it looks like, what it does in
// a room, and then — verbatim, in all of them — "Imprimée à la main, pièce
// par pièce…". The landing page's hero has a 34ch measure and can carry
// about two sentences before it stops reading as a poster, and its "Chez
// vous" card wants the in-a-room sentences. The handmade tail is dropped
// outright: the three-promise band directly under the hero already says it,
// with its own heading.

// Anything starting "Imprimé(e)…" is that closing boilerplate. Matched at the
// start of a sentence only, so a description that happens to use the word
// mid-sentence keeps it.
const HANDMADE_BOILERPLATE = /^\s*imprim/i;

// Quand il n'y a RIEN à découper : la description est vide en base.
//
// Pas un cas d'école — Ondine est dans cet état depuis sa mise en vente, et
// on ne s'en est aperçu que le 25 novembre 2026, en branchant les aperçus de
// lien. Sa fiche s'affichait sans un mot, et son aperçu de lien se résumait à
// « Livraison dans les 58 wilayas » précédé d'une espace.
//
// Une phrase de repli vaut mieux qu'un blanc : elle est vraie de tout ce que
// la maison vend, et elle ne fait pas croire que la fiche est cassée. Elle ne
// remplace pas une vraie description — il faut toujours l'écrire dans l'admin.
const LEAD_FALLBACK =
  "Imprimée en 3D à Alger et fabriquée après votre commande, dans la " +
  "couleur de votre choix.";

// Used when the description is too short to have anything left over — two
// sentences in, nothing out. True of every lamp, so it is safe to state.
const ROOM_FALLBACK =
  "Posée sur une table de chevet, un bureau ou un coin d'étagère, elle " +
  "diffuse une lumière douce — le genre de lumière qui donne envie de " +
  "rester encore un peu.";

// Sentence-splitting is only ever as good as the punctuation it is given.
// This is deliberately naive (no abbreviation handling), which is fine for
// French product copy with no "M." or "etc." in it, and degrades gracefully:
// the worst case is a slightly long hero paragraph, never a crash or a
// dropped sentence.
function toSentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export type ProductCopy = {
  /** Hero paragraph — the first two sentences. */
  lead: string;
  /** "Chez vous" card — whatever is left, or a generic line if nothing is. */
  room: string;
};

export function splitProductCopy(description: string): ProductCopy {
  const sentences = toSentences(description).filter(
    (sentence) => !HANDMADE_BOILERPLATE.test(sentence),
  );

  const rest = sentences.slice(2).join(" ");

  return {
    lead: sentences.slice(0, 2).join(" ") || LEAD_FALLBACK,
    room: rest || ROOM_FALLBACK,
  };
}
