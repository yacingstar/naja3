import Link from "next/link";
import { WorkshopForm } from "@/components/admin/WorkshopForm";

export default function NouvelAtelierPage() {
  return (
    <div>
      <Link
        href="/admin/ateliers"
        className="text-sm font-semibold text-encre/55 underline transition hover:text-encre"
      >
        ← Ateliers
      </Link>
      <h1 className="mt-3 font-heading text-[34px] leading-tight font-bold tracking-[-.02em]">
        Nouvel atelier
      </h1>
      <p className="mt-2 text-sm font-medium text-encre/65">
        Il apparaît sur la page <code>atelier</code> du site dès qu&apos;il est
        créé, et le formulaire d&apos;inscription s&apos;ouvre tout seul.
      </p>

      <div className="mt-8">
        <WorkshopForm />
      </div>
    </div>
  );
}
