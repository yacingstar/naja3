// Deliberately separate from (site)/layout.tsx — the admin panel must never
// inherit the public storefront's Header/Footer. Auth guard + nav land in Phase 5.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <>{children}</>;
}
