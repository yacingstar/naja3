import Image from "next/image";
import { HorlogeApercu } from "@/components/site/HorlogeApercu";
import { TeleApercu } from "@/components/site/TeleApercu";
import type { Horloge } from "@/lib/horloges";

// L'horloge à plat, dans les couleurs choisies : le même objet que la
// visionneuse 3D, dessiné en SVG.
//
// Pas de `"use client"`, et c'est le point : rien ici n'a d'état, donc ce
// composant se rend aussi bien sur le serveur — carte de boutique, aperçu de
// la rubrique, récapitulatif de commande, admin — que dans le configurateur,
// où il sert de doublure à la 3D pendant son chargement et à sa place si elle
// ne démarre pas.
//
// Le choix du dessin se fait sur le slug du produit. Une horloge ajoutée plus
// tard sans dessin retombe sur son image de repli : elle perd le fait de se
// repeindre, elle ne perd pas sa page.

export function ApercuPlat({
  slug,
  horloge,
  couleurs,
  titre,
  className = "",
}: {
  slug: string;
  horloge: Horloge;
  // La couleur effective de chaque pièce, par slot. Les valeurs de repli
  // ci-dessous ne servent qu'au cas où la palette aurait perdu une bobine en
  // cours de route : mieux vaut une teinte approchée qu'un trou noir.
  couleurs: Record<string, string>;
  titre: string;
  className?: string;
}) {
  const c = (slot: string, repli: string) => couleurs[slot] ?? repli;

  if (slug === "horloge-duo") {
    return (
      <HorlogeApercu
        fond={c("fond", "#1b4d2e")}
        avant={c("avant", "#46b65a")}
        aiguilles={c("aiguilles", "#1b4d2e")}
        titre={titre}
        className={className}
      />
    );
  }

  if (slug === "horloge-tele") {
    return (
      <TeleApercu
        cadre={c("cadre", "#1356c9")}
        cadran={c("cadran", "#f4f2ed")}
        chiffres={c("chiffres", "#1356c9")}
        heures={c("heures", "#f88112")}
        minutes={c("minutes", "#1356c9")}
        support={c("support", "#1356c9")}
        titre={titre}
        className={className}
      />
    );
  }

  return (
    <Image
      src={horloge.secours}
      alt={titre}
      fill
      sizes="(min-width: 1024px) 512px, 100vw"
      className={`object-contain ${className}`}
    />
  );
}
