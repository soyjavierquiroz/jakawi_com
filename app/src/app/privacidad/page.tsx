import type { Metadata } from "next";
import { CrossLinks, LegalList, LegalSection } from "@/components/public/LegalContent";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { brandConfig } from "@/config/brand";
import { supportConfig } from "@/config/support";

export const metadata: Metadata = {
  title: `Privacidad | ${brandConfig.name}`,
  description: "Politica operativa inicial de privacidad para pilotos privados de JAKAWI.",
};

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow={`Ultima actualizacion: ${supportConfig.legalLastUpdated}`}
      title="Privacidad"
      intro="Esta politica resume que datos trata JAKAWI durante pilotos privados y como se usan para operar espacios comerciales, Seller AI y soporte."
    >
      <LegalSection title="1. Datos que podemos tratar">
        <LegalList
          items={[
            "Datos de cuenta: nombre, apellido, email, telefono, pais, moneda y datos de acceso.",
            "Datos de tienda: nombre del negocio, slug, plan, configuracion, categorias, productos, precios e imagenes.",
            "Leads y senales comerciales: consultas, intencion, eventos, handoff a WhatsApp y actividad de journey.",
            "Mensajes de Seller AI necesarios para responder, mejorar el contexto comercial y entregar soporte.",
            "Uploads de media como imagenes de productos o audio de Seller Voice cuando el owner los carga.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Cookies y atribucion">
        <p>
          Usamos cookies de sesion para login y seguridad, y cookies de atribucion para referrals o partners durante aproximadamente 30 dias. Las
          cookies de atribucion ayudan a entender de donde vino un registro o conversion en la operacion de beta.
        </p>
      </LegalSection>

      <LegalSection title="3. Clicks y medicion operativa">
        <p>
          Los clicks de links de partner o referral pueden guardar fecha, origen, destino, user agent y referrer truncados. Para IP se utiliza
          `ipHash` en vez de guardar la IP cruda en la tabla de clicks revisada.
        </p>
      </LegalSection>

      <LegalSection title="4. Para que usamos los datos">
        <LegalList
          items={[
            "Crear y operar espacios comerciales.",
            "Mostrar productos y preparar consultas hacia WhatsApp.",
            "Dar asistencia comercial con Seller AI segun catalogo y configuracion.",
            "Atender soporte, revisar abuso y diagnosticar errores.",
            "Medir attribution, referrals, partners y revenue manual durante beta.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Proveedores y servicios externos">
        <p>
          JAKAWI usa proveedores de hosting, base de datos, storage de media y servicios externos necesarios para operar. WhatsApp es un canal
          externo: al continuar una conversacion alli aplican tambien las condiciones y politicas de WhatsApp y del negocio.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus solicitudes">
        <p>
          Puedes solicitar acceso, correccion o eliminacion de datos segun corresponda al estado operativo, obligaciones razonables y capacidad de
          soporte de la beta. Para iniciar una solicitud escribe a{" "}
          <a className="font-bold text-brand-dark underline-offset-4 hover:underline" href={`mailto:${supportConfig.supportEmail}`}>
            {supportConfig.supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Seguridad">
        <p>
          Aplicamos controles tecnicos basicos como sesiones con cookie HttpOnly, almacenamiento de passwords con hash y separacion de rutas por
          rol. Aun asi, esta etapa requiere hardening adicional antes de self-service masivo.
        </p>
      </LegalSection>

      <CrossLinks />
    </PublicPageShell>
  );
}
