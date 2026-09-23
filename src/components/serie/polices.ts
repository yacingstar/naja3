import { Inter_Tight, JetBrains_Mono } from "next/font/google";

// Les deux voix de la page d'accueil « série », d'après la référence qu'elle a
// envoyée (Illustrated Print Series, tubik) : une grotesque serrée pour les
// titres et une police de machine à écrire pour tout ce qui est étiquette,
// heure, légende. Chargées ici et appliquées seulement à l'accueil : le reste
// du site garde Fredoka et Work Sans.
export const grotesque = Inter_Tight({
  variable: "--font-grotesque",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const machine = JetBrains_Mono({
  variable: "--font-machine",
  subsets: ["latin"],
  weight: ["400", "500"],
});
