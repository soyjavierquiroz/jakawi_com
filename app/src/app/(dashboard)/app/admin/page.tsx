import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin";

const adminLinks = [
  { label: "Tiendas", href: "/app/admin/stores" },
  { label: "Países", href: "/app/admin" },
  { label: "Precios", href: "/app/admin" },
  { label: "Pagos", href: "/app/admin" },
];

export default async function AdminPage() {
  await requireSuperAdmin();

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Admin</p>
      <h1 className="text-4xl font-black">Superadmin JAKAWI</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {adminLinks.map((link) => (
          <Link key={link.label} href={link.href} className="rounded-lg border border-brand-border bg-brand-paper p-5 font-black text-brand-dark shadow-sm hover:border-brand">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
