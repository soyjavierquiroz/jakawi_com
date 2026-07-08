# Product/Storefront Polish v1

## Objetivo

Pulir la experiencia publica de storefront y pagina de producto para que una tienda QA se vea mas clara, confiable y lista para beta privada, sin cambiar reglas de negocio ni integraciones externas.

## Rutas afectadas

- `/qa-onboarding-store`
- `/qa-onboarding-store/p/qa-producto-demo`
- Componentes compartidos de storefront usados por templates `SHOWCASE`, `BOUTIQUE` y `APP_COMMERCE`.

## Cambios visuales/copy

- Header/hero de tienda con copy mas claro sobre catalogo, consulta y WhatsApp.
- CTA de WhatsApp mas visible en hero y estados vacios.
- Estado vacio con icono, texto accionable y enlace directo a WhatsApp.
- Cards de producto con badges de destacado/categoria mas claros.
- Precio presentado en un bloque legible con etiqueta `Precio`.
- Fallback visual mejorado cuando un producto no tiene imagen.
- Pagina de producto con header de retorno + WhatsApp, precio destacado, detalle con fallback y CTA desktop/mobile mas estable.

## Que no se cambio

- No se cambiaron integraciones externas.
- No se cambio tracking/pixels ni reglas criticas de conversion.
- No se cambio la visibilidad de productos.
- No se agrego checkout, pagos ni emails.
- No se tocaron Prisma, migraciones, Docker, secretos, CRM, Meta, TikTok, Google, Cloudflare ni CAPI.
- No se hizo deploy ni push.

## Validaciones

- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, 0 warnings visibles.
- `https://127.0.0.1/qa-onboarding-store` con `Host: jakawi.com`: 200.
- `https://127.0.0.1/qa-onboarding-store/p/qa-producto-demo` con `Host: jakawi.com`: 200.

## Riesgos/pendientes

- La validacion visual de los cambios nuevos queda pendiente porque el entorno local no expone `DATABASE_URL` y no se debe introducir ni copiar secretos.
- La validacion HTTP local confirma que las rutas QA siguen vivas en el proxy local, pero no reemplaza una revision visual post-merge/deploy controlado.
- SEO dinamico de storefront/producto no se sobretrabajo: estas rutas no tenian metadata especifica previa y agregar queries extra solo para metadata queda fuera del alcance de este polish.

## Siguiente hito recomendado

Release Batch v9.
