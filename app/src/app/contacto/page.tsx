import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { getSupportMailto, getSupportWhatsappUrl, supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Contacto | ${brandConfig.name}`,
  description: "Contacto para negocios, partners y soporte tecnico de JAKAWI.",
};

const whatsappUrl = getSupportWhatsappUrl("Hola JAKAWI, quiero conversar sobre la private beta.");

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow={supportConfig.market}
      title="Contacto"
      intro="Conversa con JAKAWI si tienes un negocio que vende por conversacion, quieres participar como partner o necesitas soporte tecnico."
    >
      <LegalSection title="Canales">
        <div className="grid gap-3 sm:grid-cols-2">
          <a href={getSupportMailto("Contacto JAKAWI")} className="rounded-lg border border-brand-border bg-background p-5 hover:border-brand">
            <Mail className="size-5 text-brand" />
            <p className="mt-3 font-black text-brand-dark">Email</p>
            <p className="mt-1 font-semibold text-neutral-700">{supportConfig.supportEmail}</p>
          </a>
          {whatsappUrl ? (
            <a href={whatsappUrl} className="rounded-lg border border-brand-border bg-background p-5 hover:border-brand">
              <MessageCircle className="size-5 text-brand" />
              <p className="mt-3 font-black text-brand-dark">WhatsApp</p>
              <p className="mt-1 font-semibold text-neutral-700">Disponible para soporte publico configurado.</p>
            </a>
          ) : (
            <div className="rounded-lg border border-brand-border bg-background p-5">
              <MessageCircle className="size-5 text-neutral-400" />
              <p className="mt-3 font-black text-brand-dark">WhatsApp</p>
              <p className="mt-1 font-semibold text-neutral-700">Se habilitara solo cuando exista un numero publico de soporte.</p>
            </div>
          )}
        </div>
      </LegalSection>

      <LegalSection title="Para que escribirnos">
        <LegalList
          items={[
            "Negocios interesados en participar en pilotos privados.",
            "Partners que quieren compartir JAKAWI con negocios conocidos.",
            "Soporte tecnico de cuenta, productos, Seller AI, WhatsApp o pagos manuales.",
          ]}
        />
      </LegalSection>

      <div className="flex flex-col gap-3 border-t border-brand-border pt-6 sm:flex-row">
        <Link href={siteConfig.routes.register} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark">
          Crear espacio comercial
        </Link>
        <Link href="/soporte" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-background px-5 font-bold text-brand-dark transition hover:border-brand">
          Ver soporte
        </Link>
      </div>
    </PublicPageShell>
  );
}
