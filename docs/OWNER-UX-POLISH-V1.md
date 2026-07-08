# Owner UX Polish v1

## Objetivo

Pulir la experiencia owner principal después del despliegue de integraciones/tracking, con cambios pequeños de claridad, navegación, onboarding y mensajes dentro del dashboard.

## Cambios realizados

- `/app`: se agrego progreso simple de setup para tienda creada, producto creado, integracion revisada y storefront publicado.
- `/app`: se agregaron cards de navegacion para tienda, productos, leads, integraciones y plan con copy orientado a accion owner.
- `/app/tienda`: se mejoro la ayuda contextual de slug publico, descripcion corta, WhatsApp, pais y moneda.
- `/app/productos`: se aclaro el uso de Visible y Destacado, y se mejoro el estado vacio con CTA principal para crear producto.
- `/app/integraciones`: se mantuvo el status dashboard y se tradujeron bloqueos tecnicos a mensajes owner-safe como "Configurado pero apagado", "Falta Pixel ID", "Requiere consentimiento marketing" y "CAPI global apagado por seguridad".
- `/app/plan`: se aclaro trial/plan actual, pagos manuales y upgrade manual sin checkout ni pagos reales.

## Rutas tocadas

- `/app`
- `/app/tienda`
- `/app/productos`
- `/app/integraciones`
- `/app/plan`

## Archivos tocados

- `app/src/app/(dashboard)/app/page.tsx`
- `app/src/app/(dashboard)/app/tienda/page.tsx`
- `app/src/app/(dashboard)/app/productos/page.tsx`
- `app/src/app/(dashboard)/app/integraciones/page.tsx`
- `app/src/app/(dashboard)/app/plan/page.tsx`
- `docs/OWNER-UX-POLISH-V1.md`

## Validacion

- QA_DIR: `/var/backups/jakawi.com/qa/owner-ux-polish-v1/20260708-033411`
- Se genero evidencia inicial de estado git y mapa de codigo owner.
- Validacion autenticada manual de rutas owner: pendiente si no existe sesion QA segura disponible en esta corrida.
- `npm run test --if-present`: PASS, 94 tests passed.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS con 23 warnings existentes de `<img>`/`next/image`.
- `git diff --check`: PASS.

## Que no se cambio

- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos reales.
- No emails reales.
- No deploy.
- No push.
- No secretos.
- No Docker.
- No migraciones Prisma.
- No activacion de integraciones ni cambio de flags.

## Flags seguras

```text
CRM_WEBHOOK_ENABLED=false
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
EMAIL_DELIVERY_MODE=disabled
```

## Riesgos / pendientes

- El progreso de integraciones en `/app` indica si hay integraciones guardadas/revisadas; no ejecuta APIs externas ni valida eventos externos.
- La validacion visual autenticada depende de una sesion QA segura para `qa-owner-onboarding@example.com`.
- Los cambios son copy/UI; cualquier ajuste de datos, pagos o automatizaciones queda fuera de este hito.

## Siguiente hito recomendado

Deploy Safety Runbook v1.
