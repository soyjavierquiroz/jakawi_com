# JAKAWI - Mobile Authenticated QA v1

Fecha UTC: 2026-07-02 01:12-01:20 UTC
Commit auditado: `d5533b37`
Entorno: Produccion `https://jakawi.com`
Operador: Codex QA lead / senior frontend engineer / product operator
Resultado global: NO-GO desde QA mobile/authenticated hasta ejecutar navegador real y login autenticado owner.

## 1. Resumen ejecutivo

Desde smoke HTTP, las rutas publicas criticas respondieron 200, health respondio OK y los redirects de tracking principales se comportaron como esperado. Las rutas `/app`, `/app/admin` y `/app/partner` redirigen a `/login` sin sesion.

No se pudo completar QA visual mobile/desktop ni flujos autenticados en navegador porque el host no tenia Playwright, Chromium/Chrome ni `agent-browser` disponibles, y no habia password demo seguro disponible en runtime. Por eso no hay evidencia visual ni validacion real de overflow, sticky nav, CTA visible o login owner.

Top hallazgos:
- HIGH: no se pudo ejecutar browser QA real ni capturar screenshots.
- HIGH: owner authenticated QA no se valido en navegador.
- MEDIUM: superadmin y partner authenticated QA quedaron pendientes por falta de acceso seguro.

Validado:
- Health y servicios.
- Git limpio y alineado con `origin/main`.
- HTTP smoke de rutas publicas, tracking y rutas autenticadas sin sesion.
- Protecciones por codigo para superadmin y partner portal.

Pendiente:
- QA visual mobile/desktop con navegador real.
- Login owner demo y rutas owner autenticadas.
- Superadmin/partner autenticado con credenciales o sesion segura.
- Seller AI mobile interactivo.

## 2. Alcance

Viewports objetivo: 390x844, 360x800, 1440x900.

Herramientas usadas:
- `curl` para health, headers y smoke HTTP.
- Revision estatica de codigo con `rg`/`sed`.
- No se uso navegador real: Playwright/Chromium/Chrome/agent-browser no estaban disponibles.

Rutas publicas revisadas por HTTP: `/`, `/registro`, `/login`, `/precios`, `/pago-manual`, `/soporte`, `/contacto`, `/terminos`, `/privacidad`, `/cookies`, `/megalon`, `/megalon/p/celular-demo`, `/javier`.

Owner authenticated: no validado en navegador.

Superadmin authenticated: no validado en navegador; sin sesion redirige a login y el codigo usa `requireSuperAdmin()`.

Partner authenticated: no validado en navegador; sin sesion redirige a login y el codigo usa `Partner.portalUserId`.

Seller AI: no validado interactivamente; se reviso codigo del widget y no se enviaron mensajes para evitar crear leads.

## 3. Evidencia externa

Ruta de evidencia externa: `/var/backups/jakawi.com/qa/mobile-authenticated/20260702-011244`

Screenshots: `/var/backups/jakawi.com/qa/mobile-authenticated/20260702-011244/screenshots`

Logs/evidence: `/var/backups/jakawi.com/qa/mobile-authenticated/20260702-011244/evidence`

No se commitearon screenshots, videos, cookies ni storage state. No se guardaron cookies ni sesiones dentro del repo.

## 4. Precheck

| Check | Resultado | Notas |
| --- | --- | --- |
| `git status --short` | limpio | Sin cambios ni archivos sin trackear al inicio |
| `git status -sb` | `## main...origin/main` | No ahead |
| ultimo commit | `d5533b37 docs: add backup restore drill evidence` | Esperado |
| health | OK | `{"ok":true,"service":"jakawi.com","database":"ok"}` |
| services | OK | `jakawi_com_web`, postgres, redis y minio activos |
| checkpoint | OK | `checkpoint-before-mobile-authenticated-qa-v1-20260702-011244` |

## 5. HTTP smoke

| Ruta | Esperado | Obtenido | Resultado | Notas |
| --- | --- | --- | --- | --- |
| `/` | 200 | 200 | PASS | Publica |
| `/registro` | 200 | 200 | PASS | Publica |
| `/login` | 200 | 200 | PASS | Publica |
| `/precios` | 200 | 200 | PASS | Publica |
| `/pago-manual` | 200 | 200 | PASS | Publica |
| `/soporte` | 200 | 200 | PASS | Publica |
| `/contacto` | 200 | 200 | PASS | Publica |
| `/terminos` | 200 | 200 | PASS | Publica |
| `/privacidad` | 200 | 200 | PASS | Publica |
| `/cookies` | 200 | 200 | PASS | Publica |
| `/megalon` | 200 | 200 | PASS | Store demo |
| `/megalon/p/celular-demo` | 200 | 200 | PASS | Producto demo |
| `/javier` | 200 | 200 | PASS | Store publica |
| `/r/megalon` | 307 a `/registro` | 307 a `https://jakawi.com/registro` | PASS | Setea cookies de referral |
| `/partner/partner-demo` | 307 a `/registro` | 307 a `https://jakawi.com/registro` | PASS | Setea cookies partner |
| `/partner/partner-demo/webinar` | 307 a webinar | 307 a `https://webinar.jakawi.com/` | PASS | Setea cookies partner |
| `/partner/partner-demo/no-existe` | redirect seguro | 307 a `https://jakawi.com/registro` | PASS | Sin cookies nuevas |
| `/app` | 307 a `/login` sin sesion | 307 a `/login` | PASS | Protegida |
| `/app/admin` | 307 a `/login` sin sesion | 307 a `/login` | PASS | Protegida |
| `/app/partner` | 307 a `/login` sin sesion | 307 a `/login` | PASS | Protegida |
| `/api/health` | OK | OK | PASS | Database OK |

## 6. Public mobile QA

| Ruta | Viewport | Status | Screenshot | Overflow | CTA visible | Resultado | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/registro` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin footer legal visible en HTML inicial |
| `/login` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin footer legal visible en HTML inicial |
| `/precios` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/pago-manual` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/soporte` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/contacto` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/terminos` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/privacidad` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/cookies` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/megalon` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Seller AI no interactivo |
| `/megalon/p/celular-demo` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Seller AI no interactivo |
| `/javier` | 390x844, 360x800 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |

## 7. Public desktop QA

| Ruta | Viewport | Status | Screenshot | Overflow | CTA visible | Resultado | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 1440x900 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/precios` | 1440x900 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/megalon` | 1440x900 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |
| `/megalon/p/celular-demo` | 1440x900 | 200 | N/A | No probado | Marcadores HTML OK | PARTIAL PASS | Sin navegador |

## 8. Owner authenticated QA

Login demo resultado: no validado. No se escribio password en documentos, comandos finales ni evidencia. No habia password seguro disponible en runtime y no habia navegador real para ejecutar el flujo.

| Ruta | Viewport | Status | Screenshot | Auth OK | Overflow | Resultado | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/app` | 390x844 | 307 sin sesion | N/A | No probado | No probado | NOT VALIDATED | Redirige a `/login` sin sesion |
| `/app/tienda` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/productos` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/seller-ai` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/whatsapp` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/leads` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/plan` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/referrals` | 390x844 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app` | 1440x900 | 307 sin sesion | N/A | No probado | No probado | NOT VALIDATED | Redirige a `/login` sin sesion |
| `/app/productos` | 1440x900 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/leads` | 1440x900 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |
| `/app/plan` | 1440x900 | N/A | N/A | No probado | No probado | NOT VALIDATED | Requiere login owner |

## 9. Seller AI mobile QA

Apertura widget: no validada en navegador.

Chat: no probado. No se envio el mensaje benigno para evitar crear leads sin navegador y sin control visual del flujo.

Layout: no validado visualmente. Revision estatica del widget muestra:
- En mobile abierto usa `fixed inset-0`, `h-[100dvh]`, header fijo dentro del panel y area de mensajes con `overflow-y-auto`.
- Header incluye boton volver, cerrar y mute.
- Input y quick replies estan en footer del widget.
- CTA WhatsApp aparece despues de mensajes.

Riesgo: sin navegador real no se puede confirmar si sticky CTA, teclado movil, safe areas, quick replies, audio/mute o input se comportan bien en 390x844/360x800.

## 10. Superadmin QA

Autenticado: no validado. No hubo acceso seguro de superadmin y no se crearon sesiones por DB.

Sin sesion:
- `/app/admin` redirige 307 a `/login`.

Revision por codigo:
- `src/lib/admin.ts` define `requireSuperAdmin()` sobre `requireUser()` y `role === "SUPER_ADMIN"`.
- Las rutas `/app/admin`, `/app/admin/stores`, `/app/admin/payments`, `/app/admin/revenue`, `/app/admin/referrals`, `/app/admin/partners`, `/app/admin/commissions` y `/app/admin/rewards` llaman `requireSuperAdmin()`.

Estado: pendiente QA manual con superadmin real. Severidad de cobertura: MEDIUM.

## 11. Partner portal QA

Autenticado: no validado. No hubo usuario partner con acceso seguro.

Sin sesion:
- `/app/partner` redirige 307 a `/login`.

Revision por codigo:
- `src/lib/partner-portal.ts` usa `requireUser()`.
- Para usuario normal busca `partner.findFirst({ where: { portalUserId: user.id } })`.
- El schema contiene `Partner.portalUserId` unico y relacion a `User`.
- Si no hay partner vinculado, la pagina muestra estado vacio sin exponer datos partner.

Estado: pendiente QA manual con usuario partner real. Severidad de cobertura: MEDIUM.

## 12. Hallazgos

| ID | Severidad | Area | Hallazgo | Evidencia | Recomendacion | Bloquea private beta |
| --- | --- | --- | --- | --- | --- | --- |
| MQA-001 | HIGH | QA visual mobile/desktop | No se pudo ejecutar QA con navegador real ni capturar screenshots porque no hay Playwright, Chromium/Chrome ni `agent-browser` disponibles. | Comandos de deteccion sin binarios disponibles; screenshots dir vacio esperado. | Ejecutar nuevo pase en entorno con navegador ya instalado, sin instalar dependencias en produccion. | Si, bloquea decision basada en QA mobile/authenticated. |
| MQA-002 | HIGH | Owner authenticated | No se valido login owner demo ni rutas `/app/*` autenticadas. | Sin password seguro disponible en runtime y sin navegador. `/app` sin sesion redirige a `/login`. | Repetir con password demo inyectado de forma segura y navegador real; capturar mobile/desktop. | Si, hasta validar dashboard owner. |
| MQA-003 | MEDIUM | Seller AI | No se valido apertura, input, quick replies ni respuesta del widget en mobile. | Solo revision estatica de `SellerAiWidget`; no se envio chat. | Validar widget en mobile 390x844 y 360x800; maximo 1 mensaje benigno. | Si Seller AI es alcance obligatorio de beta, si. |
| MQA-004 | MEDIUM | Superadmin | Admin autenticado no validado en navegador. | Sin sesion redirige a `/login`; codigo usa `requireSuperAdmin()`. | QA manual con credenciales reales/sesion segura antes de operacion. | No para beta owner controlada, si para operar admin desde mobile. |
| MQA-005 | MEDIUM | Partner portal | Partner autenticado no validado en navegador. | Sin sesion redirige a `/login`; codigo usa `Partner.portalUserId`. | QA manual con usuario partner vinculado antes de habilitar partners. | No para beta owner controlada, si para beta partner. |
| MQA-006 | INFO | Tracking | Redirects publicos esperados responden 307; destino invalido no setea cookies nuevas. | `http-smoke.txt`. | Mantener smoke antes de beta. | No. |

No se confirmaron BLOCKER funcionales del producto en esta pasada. Los HIGH son de cobertura obligatoria no completada.

## 13. Checklist antes de private beta

Must fix:
- MQA-001: ejecutar browser QA real con screenshots externos.
- MQA-002: validar login owner demo y rutas owner autenticadas.
- MQA-003: validar Seller AI mobile si es parte del alcance beta.

Should fix:
- MQA-004: validar superadmin autenticado si el equipo operara pagos/revenue/referrals durante beta.
- MQA-005: validar partner portal autenticado antes de activar partners externos.

Can wait:
- MQA-006: mantener como control informativo.

## 14. Recomendacion final

Recomendacion: NO-GO desde la perspectiva de este sprint mobile/authenticated QA, no por una falla funcional confirmada sino porque la evidencia obligatoria no pudo generarse.

Condiciones para cambiar a GO en private beta controlada:
- Ejecutar QA visual con navegador real en 390x844, 360x800 y 1440x900.
- Validar login demo owner y rutas `/app`, `/app/tienda`, `/app/productos`, `/app/seller-ai`, `/app/whatsapp`, `/app/leads`, `/app/plan`, `/app/referrals`.
- Validar Seller AI mobile sin contaminar leads mas alla de una interaccion benigna.
- Validar superadmin/partner autenticado si esos roles entran al piloto.

Siguiente sprint recomendado: Mobile Authenticated QA v1b con navegador disponible y credenciales seguras inyectadas solo en runtime.
