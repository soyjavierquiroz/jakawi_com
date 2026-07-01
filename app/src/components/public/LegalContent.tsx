import type { ReactNode } from "react";
import Link from "next/link";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-black text-brand-dark">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-brand-border bg-background px-4 py-3 font-semibold">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CrossLinks() {
  const links = [
    { href: "/terminos", label: "Terminos" },
    { href: "/privacidad", label: "Privacidad" },
    { href: "/cookies", label: "Cookies" },
    { href: "/soporte", label: "Soporte" },
  ];

  return (
    <div className="flex flex-wrap gap-3 border-t border-brand-border pt-6">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-md border border-brand-border bg-background px-4 py-2 text-sm font-bold text-neutral-700 hover:border-brand hover:text-brand-dark">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
