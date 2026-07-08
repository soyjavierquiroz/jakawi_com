# Privacy Floating CTA Mobile Polish v1

Fecha UTC: 2026-07-08
Repo: `/var/opt/jakawi.com`
QA_DIR: `/var/backups/jakawi.com/qa/privacy-floating-cta-mobile-polish-v1/20260708-205752`
Resultado: **WARN**

## Objetivo

Corregir el WARN menor de Visual QA v1 donde, en mobile, el boton flotante `Privacidad` se superponia parcialmente al CTA sticky inferior de producto publico.

## Issue corregido

- Ruta afectada: `/qa-onboarding-store/p/qa-producto-demo`
- Viewport reportado: `390x844`
- Problema: `Privacidad` tapaba parte del CTA sticky inferior `Consultar por WhatsApp`.

## Cambio aplicado

- Se agrego la clase `privacy-floating-preferences-button` al boton flotante de preferencias de privacidad.
- Se agrego la clase `storefront-product-mobile-sticky-cta` al contenedor sticky mobile de producto publico.
- Se agrego una regla CSS mobile que, cuando existe ese CTA sticky, sube el boton `Privacidad` a `calc(env(safe-area-inset-bottom) + 5.75rem)`.

El cambio es de UI/CSS/layout pequeno y no modifica logica de consentimiento, tracking ni backend.

## Validaciones

| Check | Resultado |
| --- | --- |
| Preflight working tree limpio | PASS |
| `npm run test --if-present` | PASS, 96 tests |
| `npm run typecheck --if-present` | PASS |
| `npm run lint --if-present` | PASS, 0 warnings reportados |
| `git diff --check` | PASS |

## Visual validation

**No completada localmente.**

Se levanto `next dev` local en `http://localhost:3000`, pero la ruta de producto publico respondio `500` porque el entorno local no tiene `DATABASE_URL`. No se imprimieron secretos ni se intento crear/tocar configuracion de base de datos.

Evidencia:

- `evidence/local-product-head.txt`

Screenshot `product-mobile-after.png`: **no generado**, para no registrar una pantalla 500 como evidencia visual del polish.

## Que no se cambio

- No se elimino el boton `Privacidad`.
- No se elimino el CTA sticky.
- No se desactivo consentimiento.
- No se cambio logica de tracking/consentimiento.
- No se introdujeron dependencias nuevas.
- No se toco backend.
- No se ejecutaron migraciones Prisma.
- No deploy.
- No push.
- No APIs externas.
- No CRM.
- No Meta/TikTok/Google/Cloudflare.
- No CAPI QA.
- No pagos.
- No emails.
- No secrets.

## Siguiente hito recomendado

1. Visual QA v1 retry en entorno con `DATABASE_URL` y datos disponibles.
2. Release Batch v10 si el retry visual confirma que no hay solapamiento.
