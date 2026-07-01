import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Pago manual | ${brandConfig.name}`,
  description: "Proceso operativo de pago manual durante private beta de JAKAWI.",
};

export default function ManualPaymentPage() {
  return (
    <PublicPageShell
      eyebrow="Operacion manual durante beta"
      title="Pago manual"
      intro="JAKAWI todavia no tiene checkout automatico activo. Los planes pagados se coordinan manualmente con soporte durante pilotos privados."
    >
      <LegalSection title="Pasos">
        <ol className="space-y-3">
          {[
            "Crea tu cuenta y espacio comercial.",
            "Elige el plan que quieres activar.",
            "Contacta a JAKAWI para confirmar disponibilidad, precio y canal de pago.",
            "Realiza el pago por el canal externo acordado.",
            "El superadmin registra el pago manual en JAKAWI.",
            "El superadmin activa o ajusta el plan si corresponde.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3 rounded-md border border-brand-border bg-background px-4 py-3 font-semibold">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand text-sm font-black text-white">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </LegalSection>

      <LegalSection title="Datos que puedes compartir">
        <LegalList
          items={[
            "Nombre del negocio.",
            "Email de la cuenta JAKAWI.",
            "Plan deseado.",
            "Referencia o comprobante externo si soporte lo solicita.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Datos que NO debes compartir">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 shrink-0 text-red-700" />
            <LegalList
              items={[
                "Claves o contrasenas.",
                "Datos completos de tarjeta.",
                "Credenciales bancarias.",
                "Codigos privados de acceso a tu email, banco o WhatsApp.",
              ]}
            />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Tiempos esperados">
        <p>
          Durante private beta, la confirmacion depende del horario de soporte, la verificacion del comprobante externo y la disponibilidad del
          operador. Soporte indicara el tiempo estimado para cada caso.
        </p>
      </LegalSection>

      <LegalSection title="Aclaracion importante">
        <p className="flex items-start gap-2 rounded-md border border-brand-border bg-brand-muted px-4 py-3 font-black text-brand-dark">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
          Registrar un pago manual en JAKAWI no ejecuta cobros automaticos.
        </p>
      </LegalSection>

      <div className="flex flex-col gap-3 border-t border-brand-border pt-6 sm:flex-row">
        <Link href={siteConfig.routes.register} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark">
          Crear espacio comercial
        </Link>
        <Link href="/contacto" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border bg-background px-5 font-bold text-brand-dark transition hover:border-brand">
          Contactar JAKAWI
        </Link>
      </div>

      <p className="text-sm font-semibold text-neutral-500">Canal principal: {supportConfig.supportEmail}</p>
    </PublicPageShell>
  );
}
