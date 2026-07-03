# Product/Core Flow QA v1

Fecha UTC: `2026-07-03T02:39:05+00:00`

## Resumen

- Resultado: `WARN`
- Repo: `/var/opt/jakawi.com`
- Branch: `main`
- HEAD auditado: `f8a4e3fc8a67179f30f99d81bfd80b8a562e4770`
- QA_DIR: `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517`
- Alcance: QA enfocada de flujos core de producto, sin CRM, sin deploy, sin push, sin Prisma/migraciones/Docker y sin mutaciones productivas.

## Estado runtime basico

| Check | Resultado |
| --- | --- |
| `HEAD https://jakawi.com` | `HTTP/2 200` |
| `GET https://jakawi.com/api/health` | `200` |
| `HEAD https://jakawi.com/api/admin/crm-webhook/qa-test` | `405` |

Evidencia:

- Home headers: `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/curl-home-head.txt`
- Smoke HTTP seguro: `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/safe-http-smoke.txt`

## Confirmacion CRM no tocado

- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- No se activo `CRM_WEBHOOK_ENABLED`.
- No se hizo `POST` a `/api/admin/crm-webhook/qa-test`.
- No se enviaron eventos CRM.
- No se leyeron ni expusieron secretos; el secret solo se verifico como `present-redacted`.

Evidencia sanitizada: `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/crm-env-sanitized.txt`

## Mapa de rutas core detectadas

Inventario generado desde `app/src/app`:

- Archivos de rutas/layouts detectados: `49`
- Archivos core inventariados en `app/src/lib`, `app/src/components`, `app/src/config`, `app/prisma`: `131`
- Mapa keyword core: primeras `300` coincidencias guardadas.

Rutas publicas:

- `/`
- `/precios`
- `/contacto`
- `/soporte`
- `/terminos`
- `/privacidad`
- `/cookies`
- `/pago-manual`
- `/demo`

Auth / registro:

- `/login`
- `/registro`

Dashboard owner:

- `/app`
- `/app/tienda`
- `/app/productos`
- `/app/productos/nuevo`
- `/app/productos/[productId]/editar`
- `/app/categorias`
- `/app/seller-ai`
- `/app/agente`
- `/app/whatsapp`
- `/app/leads`
- `/app/leads/[leadId]`
- `/app/referrals`
- `/app/plan`

Storefront:

- `/[storeSlug]`
- `/[storeSlug]/p/[productSlug]`

Partner / growth:

- `/r/[storeSlug]`
- `/partner/[code]`
- `/partner/[code]/[destinationSlug]`
- `/app/partner`

Admin / superadmin:

- `/app/admin`
- `/app/admin/stores`
- `/app/admin/partners`
- `/app/admin/referrals`
- `/app/admin/revenue`
- `/app/admin/payments`
- `/app/admin/commissions`
- `/app/admin/rewards`

APIs detectadas:

- `/api/health`
- `/api/visitor`
- `/api/whatsapp/click`
- `/api/uploads/seller-voice`
- `/api/seller-ai/opening`
- `/api/seller-ai/lead`
- `/api/seller-ai/chat`
- `/api/seller-ai/events`
- `/api/seller-ai/continue-whatsapp`
- `/api/admin/crm-webhook/qa-test`

Evidencia:

- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/app-routes-files.txt`
- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/core-files-inventory.txt`
- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/core-keyword-map.txt`

## Flujos core detectados

### Landing/public

Detectado en `/`, `/precios` y paginas publicas legales/soporte. El smoke seguro confirmo `200` en home, precios, contacto, soporte, terminos, privacidad, cookies y pago manual.

### Auth

Detectado en `/login`, `/registro`, `loginAction`, `registerAction`, sesiones con cookie `jakawi_session` y guards `requireUser` / `requireStore`.

Validado sin credenciales:

- `/login`: `200`
- `/registro`: `200`
- `/app`: `307` hacia `/login`

No se ejecuto login real ni registro real porque crearian o tocarian sesiones/datos productivos.

### Owner / alta de tienda

Detectado en `registerAction`: crea `User`, crea `Store`, publica tienda por defecto, crea sesion, intenta atribucion de adquisicion y llama `sendOwnerCrmEvent`.

No se ejecuto porque registra datos productivos. Con `CRM_WEBHOOK_ENABLED=false`, el envio CRM queda apagado por configuracion, pero el registro en si mutaria la base.

### Store

Detectado en `/app/tienda`, `/[storeSlug]`, `/[storeSlug]/p/[productSlug]` y acciones `updateStoreAction`, identidad visual, template comercial, categorias y productos.

Validado sin autenticacion:

- `/app/tienda`: `307` hacia `/login`
- Rutas publicas storefront quedaron inventariadas. No se probo un slug real para evitar generar analytics o señales de comportamiento reales.

### Dashboard

Detectado en `/app` con resumen operativo, link publico, referidos, uso de plan, leads y WhatsApp. La navegacion owner incluye tienda, productos, categorias, Seller AI, WhatsApp, clientes, referidos y plan.

Validado sin autenticacion:

- `/app`: `307` hacia `/login`
- `/app/productos`: `307` hacia `/login`

No se navego autenticado por falta de credenciales QA explicitas y para evitar mutaciones accidentales.

### Onboarding

No aparece una ruta dedicada `/onboarding`. El onboarding existe como flujo implicito:

- `/registro` crea espacio comercial.
- `/app` calcula "Siguiente paso recomendado".
- `/app/tienda`, `/app/productos/nuevo`, `/app/seller-ai` completan configuracion owner.

Pendiente recomendado: `Owner Onboarding Flow QA v1`.

### Partner

Detectado en:

- Links publicos `/partner/[code]`, `/partner/[code]/[destinationSlug]`.
- Referidos owner `/r/[storeSlug]`.
- Portal autenticado `/app/partner`.
- Admin de partners, revenue, comisiones y recompensas.

Validado sin mutar datos reales:

- `/partner/qa-nonexistent-code`: `307` hacia `/registro`.
- `/r/qa-nonexistent-store`: `307` hacia `/registro`.
- `/app/partner`: `307` hacia `/login`.

Nota de seguridad: los links de partner/referral registran clicks cuando el codigo existe. Por eso solo se probaron codigos inexistentes.

### Admin / superadmin

Detectado en `/app/admin/*`, `requireSuperAdmin`, panel de tiendas, partners, referrals, revenue, pagos, comisiones y recompensas.

Validado sin autenticacion:

- `/app/admin`: `307` hacia `/login`.

No se probo vista autenticada superadmin ni acciones manuales porque pueden consultar o modificar datos operativos reales.

## Estados de error importantes

- No autenticado en dashboard/admin/partner: `307` hacia `/login`.
- CRM QA route sin metodo permitido: `405` en `HEAD`, esperado porque solo define `POST` superadmin.
- Partner/referral inexistente: `307` hacia `/registro`.
- `/api/health`: `200`, DB `ok` segun ruta.

No se detectaron errores `5xx` en las rutas seguras probadas.

## Integraciones externas detectadas

Inventario solamente, sin ejecutar:

- CRM webhook: `app/src/lib/crm-webhook.ts`, `app/src/config/crm-webhook.ts`, endpoint QA admin. No ejecutado.
- WhatsApp: enlaces `wa.me`, `/api/whatsapp/click`, handoff Seller AI. No ejecutado con datos reales.
- Seller AI: APIs `/api/seller-ai/*` crean o actualizan leads/conversaciones. No ejecutadas.
- Uploads/imagenes: `app/src/lib/images/*`, `/api/uploads/seller-voice`, S3-compatible SDK. No ejecutado.
- Pagos: ledger manual `StorePayment`, paginas admin de pagos/revenue/comisiones. No hay cobro automatico detectado en esta QA; no se ejecuto ninguna accion.
- Email: enlaces `mailto:` para upgrade/soporte. No se envio email.

## Que se valido realmente

- Estado git inicial limpio.
- Inventario de rutas y archivos core.
- Home production `200`.
- `/api/health` production `200`.
- Public pages seguras con `HEAD`: `200`.
- Auth pages `/login` y `/registro`: `200`.
- Guards no autenticados de owner/dashboard/admin/partner: `307` hacia `/login`.
- Partner/referral inexistente: `307` hacia `/registro` sin registrar clicks reales.
- CRM QA route: `405` por metodo no permitido; no se hizo `POST`.
- Validaciones locales: `npm run test --if-present`, `npm run typecheck --if-present`, `npm run lint --if-present`.

## Que NO se ejecuto por seguridad

- No registro owner real.
- No login con emails reales.
- No creacion/edicion/borrado de tienda, productos, categorias o plan.
- No clicks a WhatsApp reales ni `/api/whatsapp/click` con producto real.
- No APIs Seller AI que creen leads o conversaciones.
- No rutas de partner/referral con codigos reales, porque registran clicks.
- No acciones admin/superadmin de pagos, comisiones, recompensas, partners o planes.
- No POST CRM.
- No deploy.
- No push.
- No Prisma generate/migrate ni cambios de schema.
- No Docker.
- No pagos reales.
- No emails reales.
- No exposicion de secrets.

## Validaciones locales

| Comando | Exit | Resultado |
| --- | ---: | --- |
| `npm run test --if-present` | `0` | `PASS`: 6 tests CRM webhook, 6 pass, 0 fail |
| `npm run typecheck --if-present` | `0` | `PASS`: `tsc --noEmit` sin errores |
| `npm run lint --if-present` | `0` | `WARN`: 23 warnings, 0 errors |

Evidencia:

- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/npm-test.txt`
- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/npm-typecheck.txt`
- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/npm-lint.txt`
- `/var/backups/jakawi.com/qa/product-core-flow-qa-v1/20260703-023517/evidence/npm-status.txt`

## Hallazgos

### Bloqueadores

- Ninguno detectado en rutas seguras. Home y health responden `200`; no hubo `5xx` en el smoke no autenticado.

### Warnings

- `npm lint` pasa con exit `0`, pero reporta 23 warnings `@next/next/no-img-element`.
- Los flujos autenticados core no se pudieron validar end-to-end sin credenciales QA y sin mutar datos productivos.
- El registro owner es el alta real de cuenta/tienda y llama al wrapper CRM; no debe ejecutarse en produccion sin plan QA dedicado.
- Las rutas `/r/[storeSlug]` y `/partner/[code]` pueden registrar clicks si el codigo existe; cualquier QA con codigos reales debe usar data QA etiquetada.
- El coverage de tests actual observado esta concentrado en CRM webhook; no cubre todavia owner onboarding, dashboard, productos o partner flow.

### Mejoras

- Crear usuario/tienda QA etiquetada y autorizada para validar owner onboarding sin emails reales.
- Agregar smoke autenticado controlado para `/app`, `/app/tienda`, `/app/productos`, `/app/seller-ai`, `/app/leads` y `/app/plan`.
- Agregar tests de `registerAction`/validaciones de slug y limite sin tocar DB productiva.
- Reducir warnings de imagenes o documentar excepciones intencionales en storefront/dashboard.

## Proximos fixes / hitos priorizados

1. `Owner Onboarding Flow QA v1`: validar registro/controlado en data QA, primer login, dashboard, tienda, producto inicial y siguiente paso recomendado.
2. `Owner Catalog Management QA v1`: crear/editar/ocultar/destacar producto con data QA, validar limites de plan y storefront.
3. `Dashboard Signals QA v1`: validar cards de leads, WhatsApp, Seller AI y plan con fixtures o data QA.
4. `Partner Flow QA v1`: usar partner QA etiquetado para validar links, cookies, atribucion y portal read-only sin afectar metricas reales.
5. `Superadmin Read-only QA v1`: validar acceso y vistas admin con usuario superadmin QA, sin acciones manuales de pago/comision/recompensa.
6. `Lint Warning Cleanup v1`: decidir si migrar imagenes a `next/image` o documentar excepciones.

## Recomendacion de siguiente hito concreto

Siguiente hito recomendado: `Owner Onboarding Flow QA v1`.

Debe ejecutarse con datos QA explicitamente etiquetados, email no real, sin pagos, sin emails, sin CRM y con stop condition si cualquier accion pudiera afectar usuarios reales.

## Resultado frente a criterios

- PASS: App responde `200` en home.
- PASS: Rutas core inventariadas.
- PASS: Tests/typecheck/lint ejecutados y documentados.
- PASS: Sin cambios productivos.
- PASS: Sin CRM.
- WARN: `npm lint` tiene 23 warnings.
- WARN: flujos autenticados/mutativos detectados, pero no ejecutados por seguridad.
- FAIL: ninguno observado.

