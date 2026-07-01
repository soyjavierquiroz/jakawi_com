import type { Metadata } from "next";
import { CrossLinks, LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Cookies | ${brandConfig.name}`,
  description: "Uso operativo inicial de cookies en JAKAWI.",
};

export default function CookiesPage() {
  return (
    <PublicPageShell
      eyebrow={`Ultima actualizacion: ${supportConfig.legalLastUpdated}`}
      title="Cookies"
      intro="JAKAWI usa cookies estrictamente operativas para login, seguridad, atribucion y medicion de pilotos privados."
    >
      <LegalSection title="1. Cookies de sesion">
        <p>
          Las cookies de sesion permiten mantener el login del usuario y proteger rutas privadas. En produccion se configuran como HttpOnly,
          SameSite Lax y Secure cuando corresponde.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies de atribucion">
        <p>
          Las cookies de partner y referral ayudan a asociar registros o conversiones con un origen operativo. Su duracion aproximada es de 30
          dias y se usan para medicion, suggested actions, partners y recompensas manuales.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidades">
        <LegalList
          items={[
            "Login y seguridad de cuenta.",
            "Atribucion de referrals y partners.",
            "Medicion operativa de clicks y conversiones.",
            "Soporte y diagnostico durante private beta.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Datos de terceros">
        <p>
          JAKAWI no vende datos personales a terceros. Algunas interacciones pueden continuar fuera de JAKAWI, por ejemplo en WhatsApp, donde
          aplican las politicas del proveedor externo y del negocio que atiende al cliente.
        </p>
      </LegalSection>

      <LegalSection title="5. Ayuda">
        <p>
          Si necesitas ayuda con cookies, privacidad o atribucion, escribe a{" "}
          <a className="font-bold text-brand-dark underline-offset-4 hover:underline" href={`mailto:${supportConfig.supportEmail}`}>
            {supportConfig.supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <CrossLinks />
    </PublicPageShell>
  );
}
