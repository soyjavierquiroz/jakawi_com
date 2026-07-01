# JAKAWI — Pre-Launch Hardening QA v1

Fecha: 2026-07-01 21:00-21:10 UTC
Commit auditado: `923b4968 docs: add comprehensive project readme`
Health: `ok=true`, `database=ok`
Auditor: Codex
Entorno: produccion `https://jakawi.com`, repo local `/var/opt/jakawi.com`

## 1. Resumen ejecutivo

JAKAWI esta en MVP avanzado con una base tecnica real: build pasa, lint no tiene errores, health responde con DB ok, las rutas publicas principales cargan, las rutas protegidas redirigen a login sin sesion, el tracking partner/referral setea cookies HttpOnly/SameSite y el modelo de datos de growth/revenue existe en produccion.

Decision recomendada:

- GO condicional para private beta muy controlada con pocos negocios conocidos, soporte cercano y operacion manual.
- NO-GO para public self-service masivo.
- NO-GO para pilotos pagos sin cerrar antes legal basico, soporte/contacto visible, proceso de pago manual claro y backup/restore verificado.

Top 5 riesgos:

1. Backup/restore no verificado para Postgres y MinIO.
2. Legal, privacidad, cookies y soporte/contacto publico no estan publicados.
3. Pago manual, rewards y commissions existen en backoffice, pero faltan runbooks operativos y copy claro para owners.
4. Mobile/UX no fue validado visualmente en navegador en este audit.
5. No se encontro rate limiting/captcha/middleware para auth, Seller AI, uploads o tracking.

Conclusion honesta: JAKAWI puede aprender con pilotos reales controlados si el equipo opera manualmente y acompana cada cuenta. No debe abrir registro masivo ni adquisicion publica sin hardening operativo, legal, observabilidad, backups y QA e2e.

## 2. Alcance

Se reviso:

- `README.md`.
- `app/package.json`.
- `app/prisma/schema.prisma`.
- `app/prisma/migrations`.
- Rutas en `app/src/app`.
- Componentes en `app/src/components`.
- Helpers y acciones en `app/src/lib`.
- Configuracion en `app/src/config`.
- `infra/docker-stack.yml`.
- `app/Dockerfile`.
- `app/.dockerignore`.
- Produccion HTTP no autenticada.
- DB read-only en Postgres via red interna Swarm.
- Seguridad por lectura de auth/session/roles/scoping.
- Growth, referrals, partners, payments, commissions, rewards y suggested actions por lectura y DB.
- Estado de servicios Swarm de forma read-only.

No se reviso o no se ejecuto:

- Browser QA autenticado completo de owner/admin/partner.
- Registro completo creando una tienda nueva.
- Upload real de imagen/audio.
- Conversacion Seller AI por POST en produccion, para evitar crear leads nuevos.
- Backup real o restore drill.
- Pagos reales, webhooks reales o auto-payout.
- Pruebas de carga/performance.
- Revision legal por abogado.
- Push a remoto.

## 3. Estado Git / Release

- Branch: `main`.
- Estado inicial: limpio, `## main...origin/main`.
- Commit auditado: `923b4968 docs: add comprehensive project readme`.
- `main` no estaba ahead de `origin/main`.
- Checkpoint creado: `checkpoint-before-pre-launch-hardening-qa-v1-20260701-210311`.
- Tags recientes observados incluyen:
  - `jakawi-readme-launch-readiness-v1-20260701-202749`
  - `suggested-growth-actions-v1-20260701-201527`
  - `revenue-attribution-metrics-v1-20260701-190109`
  - `manual-revenue-ledger-v1-20260701-183154`
  - `growth-link-share-kit-v1-20260701-162226`

## 4. Validacion tecnica

| Validacion | Resultado | Evidencia | Severidad |
| --- | --- | --- | --- |
| Health produccion | PASS | `{"ok":true,"service":"jakawi.com","database":"ok"}` | INFO |
| ESLint | PASS con warnings | 0 errores, 23 warnings `@next/next/no-img-element` | LOW |
| Next build | PASS | Compilo, TypeScript ok, genero 36 paginas estaticas | INFO |
| Docker build/deploy | No ejecutado | Fuera de alcance del sprint | INFO |
| Prisma migrate/generate | No ejecutado | Fuera de alcance del sprint | INFO |

Warnings de lint:

- Warnings preexistentes por uso de `<img>` en storefront, uploads, Seller AI widget, dashboard y product detail.
- No bloquean private beta, pero conviene revisarlos si LCP/mobile performance se vuelve problema.

Build:

- Next.js `16.2.9` con Turbopack.
- Rutas dinamicas detectadas para public spaces, dashboard, admin, partner, Seller AI APIs, uploads y tracking.
- Build finalizo con exit code 0.

## 5. Produccion HTTP smoke

| Ruta | Esperado | Obtenido | Resultado | Notas |
| --- | --- | --- | --- | --- |
| `/` | 200 | 200 | PASS | Landing cacheada por Next. |
| `/registro` | 200 | 200 | PASS | Formulario carga. |
| `/login` | 200 | 200 | PASS | Formulario carga. |
| `/api/health` | 200 | 200 | PASS | DB ok en body previo. |
| `/megalon` | 200 | 200 | PASS | Public space carga. |
| `/javier` | 200 | 200 | PASS | Public space carga. |
| `/megalon/p/celular-demo` | 200 | 200 | PASS | Product detail carga. |
| `/r/megalon` | 307 | 307 | PASS | Redirige a `/registro`, setea cookies de store referral. |
| `/partner/partner-demo` | 307 | 307 | PASS | Redirige a `/registro`, setea cookies partner/default destination. |
| `/partner/partner-demo/webinar` | 307 | 307 | PASS | Redirige a `https://webinar.jakawi.com/`, setea cookies destination. |
| `/partner/partner-demo/no-existe` | 307 sin cookies validas | 307 sin `set-cookie` | PASS | Destination invalido cae a registro sin attribution valida nueva. |
| `/app` | 307 a login | 307 `/login` | PASS | Protegida sin sesion. |
| `/app/admin` | 307 a login o bloqueo | 307 `/login` | PASS | Protegida sin sesion. |
| `/app/admin/revenue` | 307 a login o bloqueo | 307 `/login` | PASS | Protegida sin sesion. |
| `/app/partner` | 307 a login | 307 `/login` | PASS | Protegida sin sesion. |
| `/app/referrals` | 307 a login | 307 `/login` | PASS | Protegida sin sesion. |
| `https://media.jakawi.com` | MinIO responde | 400 XML MinIO | PASS | Dominio apunta a MinIO; root sin bucket responde 400 esperado. |
| `https://minio.jakawi.com` | Basic Auth | 401 Basic realm `traefik` | PASS | Consola protegida por Basic Auth. |

Nota: los requests de smoke a referral/partner generaron clicks de auditoria el `2026-07-01 21:05:57 UTC`.

## 6. DB read-only audit

Conexion:

- `SELECT 1` por contenedor `postgres:16-alpine` en red `jakawi_com_jakawi_internal`: PASS.

Conteos principales:

| Tabla | Conteo |
| --- | ---: |
| `User` | 3 |
| `Store` | 3 |
| `Product` | 11 |
| `Lead` | 72 |
| `CustomerJourney` | 64 |
| `Partner` | 1 |
| `PartnerDestination` | 2 |
| `AcquisitionAttribution` | 1 |
| `GrowthLinkClick` | 37 |
| `StorePayment` | 3 |
| `PartnerCommission` | 2 |
| `StoreReferralReward` | 3 |

Migraciones recientes aplicadas:

| Migracion | Fecha UTC |
| --- | --- |
| `000019_add_store_payments` | 2026-07-01 18:22 |
| `000018_add_growth_link_clicks` | 2026-07-01 15:25 |
| `000017_add_store_referral_rewards` | 2026-07-01 13:52 |
| `000016_add_partner_portal_user` | 2026-07-01 13:13 |
| `000015_add_partner_commissions` | 2026-07-01 12:19 |
| `000014_add_partner_destinations` | 2026-07-01 11:43 |
| `000013_add_referral_partner_attribution` | 2026-07-01 02:01 |
| `000012_add_store_commercial_tagline` | 2026-06-30 18:33 |
| `000011_add_store_commercial_template` | 2026-06-30 13:35 |
| `000010_add_store_visual_identity` | 2026-06-30 12:24 |

Stores:

| Slug | Plan | Estado | Publicada | Productos visibles |
| --- | --- | --- | --- | ---: |
| `ejemplo` | TRIAL | TRIALING | Si | 0 |
| `javier` | PRO | ACTIVE | Si | 7 |
| `megalon` | PRO | ACTIVE | Si | 4 |

Productos publicos relevantes:

- `megalon/celular-demo`, `mochila-urbana`, `audifonos-bluetooth`, `termo-para-oficina`.
- `javier/caesar-with-chicken`, `creamy-chicken-alfredo`, `pan-seared-salmon`, otros.

Partners/destinations:

| Partner | Code | Estado | Commission bps | Destinations |
| --- | --- | --- | ---: | --- |
| Partner Demo | `partner-demo` | ACTIVE | 2000 | `registro`, `webinar` |

Pagos por estado:

| Estado | Moneda | Conteo | Monto cents |
| --- | --- | ---: | ---: |
| CANCELLED | BOB | 1 | 99700 |
| CONFIRMED | BOB | 1 | 99700 |
| REFUNDED | BOB | 1 | 99700 |

Commissions/rewards:

- `PartnerCommission`: 1 `PAID`, 1 `CANCELLED`.
- `StoreReferralReward`: 1 `APPLIED`, 1 `PENDING`, 1 `CANCELLED`.

Growth clicks:

| Source | Conteo |
| --- | ---: |
| PARTNER | 24 |
| STORE_REFERRAL | 13 |

Clicks recientes:

- Incluyen `/partner/partner-demo`, `/partner/partner-demo/webinar` y `/r/megalon`.
- Los ultimos 3 corresponden al smoke del audit.
- No se observaron emails en el reporte; se omitieron datos personales.

Data QA detectada:

- Partner `partner-demo`.
- Store/productos con copy demo, por ejemplo `celular-demo`.
- Pagos `QA pago manual confirmado/cancelado/reembolsado`.
- Comisiones `Comision demo QA ledger v1`.
- Rewards `QA reward`, `QA reward pending`, `QA reward cancelada`.

## 7. QA funcional por modulo

### A. Registro y login

- Estado: parcialmente validado.
- Evidencia:
  - `/registro` responde 200.
  - HTML contiene formulario con nombre, apellido, WhatsApp, email, password, store name, slug, pais, moneda y plan hidden `TRIAL`.
  - `/login` responde 200.
  - Rutas protegidas sin sesion redirigen a `/login`.
  - Codigo crea `User`, `Store`, `Session` y `AcquisitionAttribution`; limpia cookies de attribution al registrar.
- Riesgos:
  - No se ejecuto registro completo para evitar crear data nueva.
  - No hay rate limiting/captcha visible para registro/login.
  - No se valido flujo multi-country en navegador.
- Severidad: HIGH por ausencia de rate limiting antes de self-service; MEDIUM para private beta controlada.
- Recomendacion: probar registro e2e con data `qa-launch-*` en un sprint de QA autorizado, y agregar protecciones anti-abuso antes de abrir trafico.

### B. Public Commercial Spaces

- Estado: validado por HTTP y HTML parcial.
- Evidencia:
  - `/megalon`, `/javier` y `/megalon/p/celular-demo` responden 200.
  - HTML de `megalon` incluye productos, CTA sticky mobile y `SellerAiWidget`.
  - DB muestra productos visibles por store.
- Riesgos:
  - No hubo screenshot real desktop/mobile.
  - Algunas imagenes usan placeholder en productos.
  - Warnings `<img>` pueden impactar performance.
- Severidad: MEDIUM.
- Recomendacion: QA visual manual por template y viewport antes de sumar negocios reales.

### C. Seller AI

- Estado: validado por lectura y presencia render; no se ejecuto chat real.
- Evidencia:
  - APIs existen: opening, chat, events, lead, continue-whatsapp.
  - `opening` bloquea stores no publicadas y planes sin Seller AI.
  - `chat` limita mensaje a 1000 caracteres y max 30 mensajes de usuario por conversacion.
  - `incrementSellerAiConversationUsage` aplica enforcement por plan y journey.
  - `continue-whatsapp` crea snapshot y exige telefono cuando el plan/flow lo requiere.
  - Respuestas heuristicas evitan inventar stock/envio/garantia en los casos revisados.
- Riesgos:
  - No hay rate limiting visible en APIs publicas.
  - No se valido integracion real con navegador/voice notes.
  - Eventos publicos pueden escribir activity sin autenticacion; esperado para tracking, pero requiere rate limiting.
- Severidad: HIGH para self-service, MEDIUM para private beta controlada.
- Recomendacion: agregar rate limiting y e2e de opening-chat-handoff antes de escalar.

### D. Owner backoffice

- Estado: validado por codigo y redirect; no autenticado manual.
- Evidencia:
  - Rutas owner existen: dashboard, tienda, productos, categorias, Seller AI, WhatsApp, leads, plan, referrals.
  - `requireStore` busca store por `ownerId`.
  - Server actions owner llaman `requireStore`.
- Riesgos:
  - No se probo browser authenticated.
  - No se probaron uploads reales ni CRUD real.
- Severidad: MEDIUM.
- Recomendacion: hacer QA manual autenticado con cuenta demo estable antes de pilotos.

### E. Leads / Customer Journey

- Estado: validado por DB y lectura.
- Evidencia:
  - DB contiene 72 leads y 64 journeys.
  - Modelos `Lead`, `CustomerJourney`, `LeadEvent`, `JourneyEvent` y `CommercialSnapshot` existen.
  - Dashboard owner clasifica contactables, handoff WhatsApp e intencion anonima.
- Riesgos:
  - Data actual parece mezclada con QA/demo.
  - No se valido un journey nuevo completo en navegador.
- Severidad: MEDIUM.
- Recomendacion: separar o etiquetar data QA antes de pilotos reales.

### F. Media pipeline

- Estado: validado por lectura e infraestructura.
- Evidencia:
  - Imagenes usan Sharp y salida WebP.
  - Audio Seller Voice usa ffmpeg, MP3 mono 24 kHz 48 kbps y limite 15s por helper.
  - Upload seller voice requiere `requireStore`.
  - Safe delete valida dominio, bucket, prefijos y pertenencia a store.
  - `media.jakawi.com` responde desde MinIO.
- Riesgos:
  - Upload real no probado.
  - No se confirmo backup/restore de objetos MinIO.
  - No hay rate limiting de uploads visible.
- Severidad: HIGH por backup/rate limiting; MEDIUM para flujo funcional.
- Recomendacion: prueba controlada de upload imagen/audio y backup MinIO antes de pilotos pagos.

### G. Superadmin

- Estado: validado por codigo y redirect sin sesion.
- Evidencia:
  - Rutas admin existen para stores, referrals, partners, commissions, rewards, payments y revenue.
  - `requireSuperAdmin` llama `requireUser` y luego `notFound()` si role no es `SUPER_ADMIN`.
  - Acciones admin sensibles llaman `requireSuperAdmin`.
- Riesgos:
  - No se valido con sesion real de superadmin.
  - Operacion manual puede equivocarse si no hay runbook/auditoria completa.
- Severidad: MEDIUM.
- Recomendacion: smoke manual con superadmin y checklist operativo antes de operar pagos reales.

### H. Partner/referral growth

- Estado: validado por HTTP, DB y lectura.
- Evidencia:
  - `/r/megalon` setea cookies de referral y registra click.
  - `/partner/partner-demo` y `/partner/partner-demo/webinar` setean cookies partner.
  - Destination invalido no setea cookies partner nuevas.
  - Cookies son HttpOnly, SameSite Lax, Secure en produccion.
  - DB tiene 37 clicks.
- Riesgos:
  - No hay deduplicacion fuerte de clicks.
  - Data demo activa puede contaminar metricas.
- Severidad: MEDIUM.
- Recomendacion: etiquetar/limpiar QA y definir dedupe por ventana/session antes de reporting comercial serio.

### I. Payments / Revenue Ops

- Estado: validado por DB y lectura.
- Evidencia:
  - Ledger `StorePayment` existe.
  - Admin puede crear/actualizar pagos manuales por server action.
  - Validaciones bloquean montos invalidos, estado invalido y referencias con patrones sensibles.
  - Owner ve historial en plan.
- Riesgos:
  - No hay checkout real ni webhooks.
  - Pago confirmado no aplica plan automaticamente.
  - Falta proceso visible para owner y runbook para operador.
- Severidad: HIGH antes de pilotos pagos; BLOCKER para self-service.
- Recomendacion: documentar pago manual Bolivia, quien confirma, SLA, evidencia requerida y como se actualiza plan.

### J. Commissions / Rewards

- Estado: validado por DB y lectura.
- Evidencia:
  - Ledgers manuales existen.
  - Estados se validan por helpers.
  - No hay auto-payout ni auto-application.
- Riesgos:
  - Falta politica comercial formal para partners/referidos.
  - Data demo existe en produccion.
- Severidad: MEDIUM para private beta, HIGH antes de partner-led acquisition.
- Recomendacion: definir politica operativa y limpiar/etiquetar QA.

### K. Suggested actions

- Estado: validado por lectura.
- Evidencia:
  - Suggested actions se generan solo con pagos `CONFIRMED` y attribution partner/store referral.
  - Detecta `COVERED`, `SUGGESTED`, `NOT_APPLICABLE` y `NEEDS_REVIEW`.
  - Prefill URLs apuntan a forms admin manuales.
- Riesgos:
  - No se valido manualmente en navegador.
  - Si attribution QA queda mezclada, sugerencias pueden confundir revenue real.
- Severidad: MEDIUM.
- Recomendacion: QA con superadmin y datos controlados antes de usar en cierre comercial.

## 8. Seguridad y privacidad

Auth/session:

- Passwords se hashean con bcrypt cost 12.
- Sesion usa valor aleatorio, se guarda hash SHA-256 en DB y cookie HttpOnly/SameSite Lax/Secure en produccion.
- Rutas protegidas sin sesion redirigen a `/login`.

Roles/scoping:

- Owner scoping por `requireStore` y `ownerId`.
- Superadmin por `requireSuperAdmin`.
- Partner portal por `Partner.portalUserId` via `requirePartnerPortal`.
- Rutas admin no fueron publicas sin sesion en smoke.

Cookies attribution:

- HttpOnly, SameSite Lax, Secure en produccion, 30 dias.
- Invalid partner destination no setea cookies nuevas.

IP/privacy:

- Growth clicks guardan `ipHash`, user agent y referrer truncados.
- No se observo persistencia de IP cruda en `GrowthLinkClick`.

Uploads:

- Seller voice upload requiere owner autenticado.
- Safe delete evita borrar assets globales o de otra tienda.
- Falta rate limiting visible para uploads.

Credenciales:

- No se incluyeron valores reales de `.env.stack` en este documento.
- `README.md` lista nombres de variables y advierte no exponer valores.

Riesgos de seguridad:

- No se encontro rate limiting/captcha/middleware para auth, Seller AI, uploads o tracking.
- No se observo CSRF explicito en server actions; Next Server Actions mitigan parte del vector, pero conviene revisar postura antes de self-service.
- Observabilidad de abuso es basica.

## 9. Mobile / UX readiness

Se pudo validar:

- HTML de public space incluye layout responsive, CTA sticky mobile y widget Seller AI.
- `/registro` y `/login` tienen viewport meta y layouts responsive por clases Tailwind.
- No se detecto Playwright ni `agent-browser` disponible localmente.
- No hay `playwright.config.*` ni suite e2e detectada.

No se pudo validar:

- Screenshots mobile/desktop.
- Ausencia real de scroll horizontal.
- Que sticky CTA no tape contenido en dispositivos reales.
- Seller AI full-screen mobile.
- Dashboard owner/admin mobile.
- Share kit QR mobile.

Riesgo:

- Mobile visual QA debe hacerse manualmente antes de pilotos, porque el principal canal comercial probablemente sera movil.

Severidad: HIGH antes de pilotos pagos; MEDIUM si el piloto es acompanado y con cuentas muy controladas.

Checklist manual pendiente:

- Landing `/` mobile.
- Registro `/registro` mobile.
- Login `/login` mobile.
- Public spaces `SHOWCASE`, `BOUTIQUE`, `APP_COMMERCE`.
- Product detail.
- Seller AI opening/chat/handoff.
- Owner dashboard, productos, tienda, Seller AI, leads, plan, referrals.
- Admin payments/revenue/suggested actions.
- Partner portal/share kit QR.

## 10. Backup / Restore readiness

Estado observado:

- `infra/docker-stack.yml` declara volumenes persistentes:
  - `jakawi_postgres_data`
  - `jakawi_redis_data`
  - `jakawi_minio_data`
- Servicios Swarm estan 1/1 para web, postgres, redis y minio.
- `minio_init` esta 0/1 con restart none, esperado para init job.
- README incluye necesidad de backups/restore y un patron de DB query, pero no se encontro script o runbook de backup/restore real.

Brechas:

- No hay backup automatico confirmado.
- No hay restore drill confirmado.
- No hay evidencia de backup MinIO.
- No hay RPO/RTO definidos.

Clasificacion:

- HIGH para lanzamiento comercial controlado.
- BLOCKER para self-service masivo.

Recomendacion minima para piloto:

- Backup diario Postgres con retencion definida.
- Backup/snapshot MinIO.
- Restore drill en entorno separado.
- Runbook: quien ejecuta, donde se guarda, como se verifica, RPO/RTO.

## 11. Legal / Support readiness

Rutas probadas:

- `/terminos`: 404
- `/terms`: 404
- `/privacidad`: 404
- `/privacy`: 404
- `/cookies`: 404
- `/soporte`: 404
- `/support`: 404
- `/contacto`: 404
- `/pricing`: 404
- `/precios`: 404

Estado:

- No hay terminos publicos detectados.
- No hay privacidad/cookies publicos detectados.
- No hay soporte/contacto publico detectado.
- Pricing existe en componentes/config, pero no hay ruta publica dedicada detectada.
- Pago manual se menciona en dashboard/README, pero falta proceso publico claro.
- Disclaimer Seller AI existe como principio en README y el copy de respuestas evita inventar disponibilidad/precio no publicado/envio en codigo revisado, pero falta aviso legal/UX publico.

Clasificacion:

- Legal basico faltante: HIGH antes de venta publica y pilotos pagos.
- Soporte/contacto faltante: HIGH antes de pilotos pagos.
- Pricing/pago manual confuso: HIGH.
- Politica partners/rewards faltante: MEDIUM ahora, HIGH antes de partner-led acquisition.

## 12. Datos QA / Demo en produccion

| Tipo | Ejemplo no sensible | Impacto | Accion recomendada |
| --- | --- | --- | --- |
| Store/productos | `megalon`, `celular-demo` | Puede contaminar percepcion y metricas si se mezcla con clientes reales | Marcar como demo o mover a seed controlado |
| Store | `ejemplo` TRIAL con 0 visibles | Puede aparecer en admin/revenue como cuenta real | Etiquetar QA o limpiar con plan aprobado |
| Partner | `partner-demo` | Clicks y attribution demo contaminan conversion | Marcar demo o excluir de reporting real luego |
| Partner destinations | `registro`, `webinar` | Datos utiles para QA, pero no comerciales | Mantener solo si esta rotulado como demo |
| Payments | `QA pago manual confirmado/cancelado/reembolsado` | Revenue confirmado puede confundirse con dinero real | Etiquetar/excluir/limpiar antes de reporting real |
| Commissions | `Comision demo QA ledger v1` | Puede confundirse con obligacion real | Etiquetar/excluir/limpiar |
| Rewards | `QA reward`, `QA reward pending` | Puede confundirse con beneficio real | Etiquetar/excluir/limpiar |
| Growth clicks | Clicks de `/r/megalon` y partner demo | Conversion rates artificiales | Separar QA clicks o resetear antes de pilotos |

No se borro nada.

## 13. Hallazgos priorizados

| ID | Severidad | Area | Hallazgo | Evidencia | Recomendacion | Bloquea private beta | Bloquea self-service |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLQ-001 | HIGH | Backup/Restore | No hay backup/restore verificado para Postgres/MinIO | README lo lista como pendiente; no se encontraron scripts/runbook | Implementar backup y restore drill | Si, para pilotos pagos | Si |
| PLQ-002 | HIGH | Legal | Terminos, privacidad y cookies publicos no existen | Rutas `/terminos`, `/privacidad`, `/cookies` devuelven 404 | Publicar copy legal basico | Si, para pilotos pagos | Si |
| PLQ-003 | HIGH | Soporte | No hay soporte/contacto publico | `/soporte`, `/contacto` devuelven 404 | Publicar canal de soporte y SLA inicial | Si, para pilotos pagos | Si |
| PLQ-004 | HIGH | Payments | Pago manual no tiene proceso publico/runbook completo | No checkout; dashboard dice pagos manuales | Documentar flujo, evidencia, confirmacion y plan update | Si, para pilotos pagos | Si |
| PLQ-005 | HIGH | Mobile/UX | No se pudo validar visualmente mobile | No Playwright/agent-browser disponible | QA manual mobile por flujo critico | Si, antes de pilotos pagos | Si |
| PLQ-006 | HIGH | Seguridad | No se encontro rate limiting/captcha | `rg` no encontro middleware/rate limiting relevante | Rate limit auth, Seller AI, uploads, tracking | No, con trafico controlado | Si |
| PLQ-007 | MEDIUM | Data | Data QA/demo en produccion | DB: pagos QA, partner-demo, rewards QA | Etiquetar, limpiar o excluir de reporting | No, si se documenta | Si |
| PLQ-008 | MEDIUM | QA | No hay suite e2e detectada | No `playwright.config.*`; no browser tests | Agregar e2e registro/public/Seller AI/admin | No | Si |
| PLQ-009 | MEDIUM | Observabilidad | Observabilidad basica | Health + Docker logs, sin alertas confirmadas | Logs estructurados y alerta basica | No | Si |
| PLQ-010 | MEDIUM | Growth | Click tracking no deduplica | README lo declara; DB tiene clicks repetidos | Dedupe por visitor/session/ventana | No | No |
| PLQ-011 | MEDIUM | Revenue | Pago confirmado no aplica plan automaticamente | README y codigo indican manual | Mantener manual con runbook; automatizar luego | No, si operador claro | Si |
| PLQ-012 | MEDIUM | Auth QA | No se valido dashboard autenticado en navegador | Solo redirect sin sesion y lectura de codigo | QA manual con owner/admin/partner | Si, antes de pilotos pagos | Si |
| PLQ-013 | LOW | Performance | 23 warnings `<img>` | ESLint warnings | Evaluar `next/image` o loader cuando aplique | No | No |
| PLQ-014 | INFO | Infra | Servicios Swarm activos | web/postgres/redis/minio 1/1 | Mantener monitoreo | No | No |
| PLQ-015 | INFO | Security | MinIO console protegida | `https://minio.jakawi.com` devuelve 401 Basic | Mantener Basic Auth y rotacion | No | No |
| PLQ-016 | INFO | Seller AI | Plan enforcement visible | `opening` y `chat` aplican checks | Agregar tests automatizados | No | No |

## 14. Checklist antes de private beta

Must fix:

- Publicar terminos, privacidad/cookies y contacto/soporte basico.
- Definir flujo de pago manual para piloto: instrucciones owner, evidencia aceptada, responsable, confirmacion y aplicacion de plan.
- Ejecutar y documentar backup Postgres + MinIO y restore drill minimo.
- Hacer QA mobile manual en public space, registro, login, Seller AI y owner dashboard.
- Hacer QA autenticado con owner, superadmin y partner portal.
- Etiquetar o documentar data QA/demo para que no se confunda con dinero/partners reales.

Should fix:

- Rate limiting minimo en login/registro/Seller AI/uploads/tracking.
- E2E Playwright para registro, public space, product detail, Seller AI handoff y admin payments.
- Runbook superadmin para pagos, commissions, rewards y suggested actions.
- Cuenta demo estable con datos claramente marcados.
- Alertas basicas de health/logs.

Can wait:

- Checkout real.
- Webhooks Hotmart/Stripe.
- Auto-payout.
- Payment-to-plan automatico.
- Funnels/cohortes avanzados.
- Dedupe avanzado de clicks.
- Migrar todos los `<img>` a optimizacion Next.

## 15. Checklist antes de self-service publico

- Checkout real o pago manual extremadamente claro y escalable.
- Terminos, privacidad, cookies, soporte y contacto publicados.
- Backups automaticos con restore drill recurrente.
- Observabilidad con alertas.
- Rate limiting y proteccion anti-abuso.
- E2E automatizados para registro, owner, public, Seller AI, partner y admin.
- Limpieza/segmentacion de data QA.
- Onboarding guiado owner.
- Runbooks de deploy, rollback, incidentes, soporte y revenue ops.
- Politicas formales de commissions/rewards.
- Export/reporting confiable para revenue/partners.
- Reconciliacion de pagos y attribution.
- Auditoria admin ampliada.

## 16. Recomendacion final

JAKAWI puede avanzar a private beta controlada si se trata como operacion acompanada, no como self-service. La recomendacion es abrir con muy pocos negocios reales, idealmente 1-3 primero, despues de cerrar legal/contacto/pago manual/backups/mobile QA.

No abrir self-service masivo hasta tener backups probados, legal publicado, soporte operativo, rate limiting, QA e2e, limpieza de data demo y mayor observabilidad.

Siguiente sprint recomendado:

Pre-Launch Ops Closure v1:

- Legal/support minimo.
- Backup/restore drill.
- Manual payment runbook.
- Mobile/authenticated QA con screenshots.
- Data QA labeling/cleanup plan.
- Rate limiting minimo en rutas sensibles.
