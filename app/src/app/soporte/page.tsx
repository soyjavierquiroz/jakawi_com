import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { getSupportMailto, getSupportWhatsappUrl, supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Soporte | ${brandConfig.name}`,
  description: "Soporte publico para pilotos privados de JAKAWI.",
};

const whatsappUrl = getSupportWhatsappUrl("Hola JAKAWI, necesito soporte con mi espacio comercial.");

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Private beta controlada"
      title="Soporte"
      intro="JAKAWI esta en private beta controlada. El soporte se atiende con prioridad operativa para negocios piloto, partners y cuentas en evaluacion."
    >
      <LegalSection title="Como pedir ayuda">
        <p>
          El canal principal es email. Incluye el nombre de tu negocio, email de cuenta, slug del espacio comercial y una descripcion clara del
          problema. No compartas contrasenas, claves bancarias ni datos completos de tarjeta.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={getSupportMailto("Soporte JAKAWI")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white transition hover:bg-brand-dark"
          >
            <Mail className="size-4" />
            {supportConfig.supportEmail}
          </a>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border bg-background px-5 font-bold text-brand-dark transition hover:border-brand"
            >
              <MessageCircle className="size-4" />
              WhatsApp soporte
            </a>
          ) : null}
        </div>
      </LegalSection>

      <LegalSection title="Problemas comunes">
        <LegalList
          items={[
            "Acceso o login: indica el email de cuenta y que pantalla muestra el problema.",
            "Productos o imagenes: comparte el slug de producto y que intentabas actualizar.",
            "Seller AI: envia el slug del espacio, el producto consultado y el comportamiento observado.",
            "WhatsApp: confirma el numero configurado y el enlace desde donde venia el cliente.",
            "Pagos manuales: comparte negocio, email de cuenta, plan deseado y referencia externa si se solicito.",
            "Partners o referidos: incluye codigo de partner/referral y destino usado.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Horario y expectativa">
        <p>
          Horario de soporte: {supportConfig.supportHours}. Durante private beta, el objetivo operativo es responder casos criticos de negocios
          piloto lo antes posible y ordenar el resto por impacto comercial.
        </p>
      </LegalSection>
    </PublicPageShell>
  );
}
