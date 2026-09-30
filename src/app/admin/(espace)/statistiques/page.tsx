import { Statistiques } from "@/components/admin/Statistiques";
import { getAdminProducts } from "@/lib/adminProducts";
import { getAdminStats } from "@/lib/adminStats";

// L'écran d'analyse, séparé de l'accueil.
//
// L'accueil répond à « qu'est-ce que je fais maintenant » ; celui-ci à
// « comment ça se passe ». Les deux lisent les mêmes chiffres (getAdminStats),
// donc ils ne peuvent pas raconter deux histoires différentes.
//
// Le catalogue est lu en plus des commandes, pour la seule comparaison qui
// demande les deux : ce qui n'a JAMAIS été commandé. C'est un écart entre deux
// ensembles, pas un calcul — il n'a donc rien à faire dans adminStats.ts, qui
// ne connaît que les commandes.
export default async function StatistiquesPage() {
  const [stats, produits] = await Promise.all([getAdminStats(), getAdminProducts()]);

  return (
    <div>
      <h1 className="font-heading text-[40px] leading-[.95] font-bold tracking-[-.03em] sm:text-[48px]">
        Statistiques
      </h1>
      <p className="mt-2 text-base font-medium text-encre/70">
        Comment se porte la boutique.
      </p>

      {stats ? (
        <Statistiques stats={stats} produits={produits} />
      ) : (
        <p className="mt-10 rounded-[1.5rem] border-[3px] border-encre bg-[#ff9ec7] p-5 font-heading text-base">
          Les statistiques n&apos;ont pas pu être lues — réessayez dans un instant.
        </p>
      )}
    </div>
  );
}
