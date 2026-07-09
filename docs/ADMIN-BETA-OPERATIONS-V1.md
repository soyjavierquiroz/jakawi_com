# Admin Beta Operations v1

## Objetivo

Dar a superadmin una vista operativa y read-only de la beta privada de JAKAWI. La pantalla resume owners, tiendas, catálogo visible, plan, billing manual, dominio e integraciones sin modificar datos ni activar servicios.

## Ruta y archivos

- Ruta nueva: `/app/admin/beta`.
- Navegación tocada: `AdminNav`, con acceso a `Beta Ops`.
- Helper seguro: `app/src/lib/admin-beta-operations.ts`.
- Tests: `app/src/lib/admin-beta-operations.test.ts`.

## Alcance

La v1 es estrictamente read-only. No agrega actions, formularios de mutación ni escritura en base de datos. Reutiliza enlaces internos seguros hacia:

- storefront público;
- `/app/admin/billing`, filtrado por slug;
- `/app/admin/stores`, filtrado por slug.

No se creó una migración Prisma: el esquema actual ya contiene los campos requeridos.

## Permisos

`/app/admin/beta` ejecuta `requireSuperAdmin()` antes de consultar o renderizar datos. Un owner normal no satisface el gate y recibe el comportamiento de ocultamiento existente (`notFound`).

## Campos mostrados

Por tienda:

- nombre, slug e email del owner parcialmente oculto;
- productos totales y productos visibles;
- plan, estado, fin de trial y renovación;
- resumen booleano `ON`/`OFF` de Meta, TikTok y Google;
- hostname y estado del dominio principal, cuando existe;
- último pago monetario con estado, importe, moneda y fecha;
- readiness y advertencias operativas.

La consulta selecciona solo campos necesarios. No carga tokens ni notas internas.

## Campos prohibidos y no expuestos

- tokens o credenciales;
- `accessTokenEncrypted`;
- secrets y variables de entorno;
- cookies o sesiones;
- hashes;
- notas internas de billing;
- referencias privadas o datos internos completos del owner.

El snapshot devuelve un objeto explícito y no propaga campos adicionales del input. El email se reduce a un prefijo corto y dominio.

## Readiness

- `READY`: existe slug, WhatsApp, storefront publicado, al menos un producto visible y el plan no está en estado suspendido/cancelado ni requiere atención de billing.
- `NEEDS_ATTENTION`: falta slug, WhatsApp, storefront publicado o producto visible; también aplica a `PAST_DUE`.
- `SUSPENDED`: `planStatus` es `SUSPENDED`, `CANCELED` o `CANCELLED`.

Las advertencias distinguen tienda incompleta, producto visible faltante, pago manual pendiente e integraciones apagadas.

## Tests y validaciones

Cobertura agregada:

- snapshot no expone token ni notas internas;
- email del owner queda redactado;
- tienda completa con producto visible queda `READY`;
- tienda sin producto visible queda `NEEDS_ATTENTION`;
- tienda suspendida o cancelada queda `SUSPENDED`;
- solo el rol `SUPER_ADMIN` satisface la autorización;
- integraciones se resumen sin material de token.

Validaciones requeridas para cierre:

- `npx prisma validate`;
- `npx prisma generate`;
- `npm run test --if-present`;
- `npm run typecheck --if-present`;
- `npm run lint --if-present`, con cero warnings;
- `git diff --check`;
- secret scan de evidencia.

## Validación visual

No realizada en esta ejecución: no se proporcionó una sesión superadmin segura. No se fabricó screenshot ni se intentó eludir autenticación. La validación visual/auth queda pendiente para **Admin Beta Operations QA v1**.

## Qué no hace

- no pagos reales;
- no checkout;
- no emails reales ni SMTP;
- no APIs externas;
- no CRM;
- no Meta, TikTok, Google o Cloudflare externos;
- no CAPI QA;
- no activación de integraciones;
- no deploy ni push.

## Siguiente hito recomendado

Ejecutar **Admin Beta Operations QA v1** con una sesión superadmin segura y documentar la validación visual. Después, incluir el resultado en **Release Batch v14**.
