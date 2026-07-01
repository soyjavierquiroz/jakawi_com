import type { Metadata } from "next";
import { CrossLinks, LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Terminos | ${brandConfig.name}`,
  description: "Terminos operativos iniciales para pilotos privados de JAKAWI.",
};

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow={`Ultima actualizacion: ${supportConfig.legalLastUpdated}`}
      title="Terminos de uso"
      intro="Estos terminos describen el uso inicial de JAKAWI durante private beta para espacios comerciales operados con acompanamiento cercano."
    >
      <LegalSection title="1. Uso en private beta">
        <p>
          JAKAWI esta disponible como piloto privado para negocios seleccionados. El servicio puede cambiar, limitarse o pausarse mientras se
          valida la operacion, la seguridad, el soporte y la experiencia comercial.
        </p>
      </LegalSection>

      <LegalSection title="2. Espacios comerciales">
        <p>
          Cada owner es responsable por la informacion que publica en su espacio comercial: productos, precios, imagenes, disponibilidad,
          condiciones de entrega, politicas propias y atencion posterior al contacto.
        </p>
      </LegalSection>

      <LegalSection title="3. Seller AI y asistencia comercial">
        <p>
          Seller AI funciona como asistencia comercial basada en la informacion del catalogo y configuracion disponible. No garantiza ventas,
          disponibilidad perfecta, respuestas absolutas ni asesoria legal, tributaria o financiera.
        </p>
      </LegalSection>

      <LegalSection title="4. WhatsApp y cierre externo">
        <p>
          WhatsApp es un canal externo de cierre y conversacion. JAKAWI puede preparar el contexto del cliente, pero el acuerdo comercial final,
          cobro, entrega y postventa quedan bajo responsabilidad del negocio y sus canales acordados.
        </p>
      </LegalSection>

      <LegalSection title="5. Pagos manuales durante beta">
        <p>
          Mientras no exista checkout automatico, la activacion de planes pagados puede gestionarse manualmente con el equipo de JAKAWI. Registrar
          un pago manual en JAKAWI no ejecuta cobros automaticos ni reemplaza el comprobante externo acordado.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso aceptable">
        <LegalList
          items={[
            "No publicar productos ilegales, fraudulentos o que vulneren derechos de terceros.",
            "No intentar abusar de formularios, Seller AI, tracking, uploads o rutas publicas.",
            "No compartir contrasenas, claves bancarias o datos completos de tarjeta con JAKAWI.",
            "No usar la plataforma para spam, suplantacion, acoso o promesas comerciales enganosas.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Suspension y limites">
        <p>
          JAKAWI puede suspender o restringir una cuenta si detecta abuso, riesgo operativo, contenido indebido, incumplimiento de estos terminos
          o solicitudes que excedan la capacidad razonable de una beta controlada.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitacion razonable de responsabilidad">
        <p>
          JAKAWI se ofrece en fase inicial y no promete disponibilidad 100%, ventas garantizadas ni resultados economicos. La responsabilidad del
          negocio sobre su oferta, cobro, entrega y relacion con clientes se mantiene en todo momento.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Para soporte, dudas operativas o solicitudes sobre estos terminos, escribe a{" "}
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
