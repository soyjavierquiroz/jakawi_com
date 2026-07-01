import Link from "next/link";
import { brandConfig } from "@/config/brand";
import { supportConfig } from "@/config/support";

const primaryLinks = [
  { href: "/precios", label: "Precios" },
  { href: "/soporte", label: "Soporte" },
  { href: "/contacto", label: "Contacto" },
];

const legalLinks = [
  { href: "/terminos", label: "Terminos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-brand-border bg-brand-paper px-5 py-8 text-sm text-neutral-600">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="text-base font-black text-brand-dark">{brandConfig.name}</p>
          <p className="mt-2 font-semibold leading-6">
            Espacios comerciales para negocios que venden por conversacion. Private beta con operacion manual.
          </p>
          <p className="mt-3 font-semibold text-neutral-500">
            Soporte:{" "}
            <a className="text-brand-dark underline-offset-4 hover:underline" href={`mailto:${supportConfig.supportEmail}`}>
              {supportConfig.supportEmail}
            </a>
          </p>
        </div>

        <nav className="grid gap-2 sm:grid-cols-2 sm:gap-x-10" aria-label="Enlaces publicos">
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-bold text-neutral-700 hover:text-brand-dark">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-bold text-neutral-500 hover:text-brand-dark">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
