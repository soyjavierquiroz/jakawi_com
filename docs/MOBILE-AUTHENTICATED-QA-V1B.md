# Mobile Authenticated QA v1b

Fecha: 2026-07-02  
Objetivo: validar QA browser real mobile/desktop con owner demo autenticado sin usar contraseña manual.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/mobile-authenticated-v1b/20260702-024314`
- Screenshots externos: `/var/backups/jakawi.com/qa/mobile-authenticated-v1b/20260702-024314/screenshots`
- Resumen browser externo: `/var/backups/jakawi.com/qa/mobile-authenticated-v1b/20260702-024314/evidence/browser-summary.json`
- Herramienta: Playwright container `mcr.microsoft.com/playwright:v1.49.1-noble`
- Capturas generadas: 30

## Autenticación QA

Se usó una sesión temporal QA para `demo@jakawi.com`, creada sin contraseña manual y con expiración corta. La sesión temporal fue borrada al final del QA y se confirmó que ya no existía. No se guardaron cookies ni capturas dentro del repo.

## HTTP Smoke

- `GET https://jakawi.com/api/health`: PASS
- Servicio: `ok`
- Base de datos: `ok`
- Timestamp observado: `2026-07-02T02:58:13.195Z`

## Public Mobile

Resultado: PASS, 13/13 rutas.

Rutas validadas con status final 200, sin error visible de app y sin overflow horizontal:

- `/`
- `/registro`
- `/login`
- `/precios`
- `/pago-manual`
- `/soporte`
- `/contacto`
- `/terminos`
- `/privacidad`
- `/cookies`
- `/megalon`
- `/megalon/p/celular-demo`
- `/javier`

## Owner Authenticated

Resultado mobile: PASS, 8/8 rutas.  
Resultado desktop: PASS, 4/4 rutas owner incluidas en la pasada desktop.

Rutas owner mobile validadas con status final 200, sin redirección a `/login`, sin error visible de app y sin overflow horizontal:

- `/app`
- `/app/tienda`
- `/app/productos`
- `/app/seller-ai`
- `/app/whatsapp`
- `/app/leads`
- `/app/plan`
- `/app/referrals`

Rutas owner desktop validadas:

- `/app`
- `/app/productos`
- `/app/leads`
- `/app/plan`

## Desktop Public

Resultado: PASS, 3/3 rutas públicas desktop.

- `/`
- `/precios`
- `/megalon`

## Seller AI Mobile

Resultado: PASS.

- Ruta: `/megalon`
- CTA usado: `Hablemos, te ayudo a elegir`
- Screenshot cerrado: generado
- Screenshot abierto: generado
- Panel visible: PASS
- Header visible: PASS
- Cierre visible: PASS
- Input visible y usable: PASS
- Quick replies visibles: PASS
- WhatsApp externo: no se abrió
- Mensajes enviados: ninguno

## Roles No Validados

Superadmin y partner siguen no autenticados en esta pasada. No se validaron credenciales ni sesiones para esos roles.

## Hallazgos

- BLOCKER: ninguno.
- HIGH: ninguno.
- MEDIUM: ninguno.

## GO / NO-GO

GO desde mobile/auth QA v1b.

Base: smoke HTTP PASS, owner demo autenticado PASS, rutas públicas mobile PASS, rutas owner mobile PASS, desktop subset PASS y Seller AI mobile PASS.
