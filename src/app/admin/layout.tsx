import { grotesque, machine } from "@/components/serie/polices";
import { ENCRE } from "@/components/serie/style";

// Deliberately separate from (site)/layout.tsx — the admin panel must never
// inherit the public storefront's Header/Footer.
//
// L'admin est passée dans le registre « série » de la boutique : même papier,
// même grotesque, mêmes étiquettes en machine à écrire. Une gestion qui
// ressemble à la boutique qu'elle gère, c'est une chose de moins à apprendre —
// et `papier-serie` redéfinit les variables de marque sur ce sous-arbre, donc
// tout ce qui utilise `font-heading`, `bg-papier` ou `text-encre` suit sans
// être réécrit (voir globals.css).
//
// Ce niveau-ci couvre aussi /admin/connexion, qui est en dehors de (espace).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div
      className={`${grotesque.variable} ${machine.variable} papier-serie admin-serie min-h-screen`}
      style={{ color: ENCRE }}
    >
      {children}
    </div>
  );
}
