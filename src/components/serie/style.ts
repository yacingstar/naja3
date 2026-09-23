// Le vocabulaire de l'accueil « série », partagé par ses sections.
//
// La référence (Illustrated Print Series, tubik) imprime ses affiches en
// risographie : quelques encres plates, pas de dégradés. On garde quatre
// encres et on les fait tourner, comme le studio le fait d'une affiche à
// l'autre. Chaque encre a sa pastille d'étiquette, plus pâle, avec un texte
// assez foncé pour rester lisible dessus.

export const G = "[font-family:var(--font-grotesque),sans-serif]";
export const M = "[font-family:var(--font-machine),monospace]";

export const ENCRE = "#1d1a17";
export const ROUGE = "#ef4f2a";

export const RISO = [
  { fond: "#4f87c2", tag: "#c3d7ee", texte: "#264f7c" }, // bleu
  { fond: "#ef4f2a", tag: "#f7c6b8", texte: "#9a2d18" }, // rouge
  { fond: "#e290d2", tag: "#f2d0ea", texte: "#853b77" }, // rose
  { fond: "#86842c", tag: "#dcdaa9", texte: "#4f4d17" }, // olive
] as const;

export function riso(i: number) {
  return RISO[i % RISO.length];
}

// L'heure de chaque veilleuse. La référence raconte une matinée, rituel par
// rituel ; Naja raconte une soirée, lumière par lumière. Des minutes
// irrégulières, comme là-bas : une soirée ne se découpe pas en demi-heures.
export const HEURES = ["20:05", "20:40", "21:10", "21:35", "22:00", "22:25", "23:10", "23:40"];

// La frise va de 20 h à minuit.
export const DEBUT = 20 * 60;
export const FIN = 24 * 60;

export function minutes(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}
