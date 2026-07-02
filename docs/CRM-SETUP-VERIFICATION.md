# JAKAWI — CRM Setup Verification v1

Fecha UTC: 2026-07-02 15:52 UTC
Entorno: production / external CRM layer
Dominio CRM: `https://crm.jakawi.com`
Resultado global: NO-GO para implementar `JAKAWI CRM Event Webhook v1` hasta completar confirmacion manual de FluentCRM Pro, FluentSMTP/AWS SES, endpoint/secret y hardening WordPress.

## 1. Resumen ejecutivo

Se verifico de forma no destructiva que `crm.jakawi.com` responde por HTTPS con HTTP 200, certificado valido para `crm.jakawi.com` y WordPress/LiteSpeed visible en headers publicos. `jakawi.com/api/health` respondio OK con DB OK.

La verificacion automatica no puede confirmar wp-admin, plugins activos, FluentCRM Pro, FluentSMTP, AWS SES, listas, tags, secuencias ni webhook, porque este sprint no usa credenciales, no entra a wp-admin y no llama APIs privadas.

Decision: NO-GO para pasar directo a `JAKAWI CRM Event Webhook v1`. La capa publica existe, pero faltan evidencias operativas bloqueantes: FluentCRM Pro activo, SMTP/SES configurado, endpoint/secret definidos fuera del repo, HMAC o bridge seguro, idempotencia por `event_id`, y secuencias en draft/desactivadas durante pruebas.

Riesgos principales:

- `wp-login.php` responde publicamente; 2FA, limite de intentos y usuarios admin minimos quedan pendientes de confirmacion.
- `xmlrpc.php` responde 405 a HEAD y declara `Allow: POST`; si no se usa, debe desactivarse o protegerse.
- No hay evidencia validada de SES/DKIM/SPF/DMARC, bounce/complaint handling ni reputation monitoring.
- No hay endpoint webhook verificado ni secret externo confirmado.

Siguiente sprint recomendado: `CRM Webhook Endpoint Verification v1`, despues de que el operador complete el checklist manual minimo de WordPress/FluentCRM/SMTP.

## 2. Evidencia externa

- QA_DIR: `/var/backups/jakawi.com/qa/crm-setup-verification-v1/20260702-155233`
- Evidencia publica: `/var/backups/jakawi.com/qa/crm-setup-verification-v1/20260702-155233/evidence/crm-public-checks.txt`
- Evidencia TLS basica: `/var/backups/jakawi.com/qa/crm-setup-verification-v1/20260702-155233/evidence/crm-tls-basic.txt`
- Timestamp QA: `/var/backups/jakawi.com/qa/crm-setup-verification-v1/20260702-155233/evidence/qa-ts.txt`
- No se guardaron credenciales, cookies autenticadas, passwords, tokens, API keys ni URLs privadas de webhook.

## 3. Checks publicos automaticos

| Check | Resultado | Evidencia | Hallazgo |
| --- | --- | --- | --- |
| JAKAWI health | PASS | `crm-public-checks.txt` | `{"ok":true,"service":"jakawi.com","database":"ok"}`. |
| CRM HTTPS HEAD | PASS | `crm-public-checks.txt` | `https://crm.jakawi.com` responde HTTP/2 200. |
| TLS basico | PASS | `crm-tls-basic.txt` | TLSv1.3, certificado valido para `crm.jakawi.com`, issuer Let's Encrypt, vencimiento 2026-09-30. |
| Headers CRM | PASS_WITH_NOTES | `crm-public-checks.txt` | WordPress API link visible, LiteSpeed, cache hit; no valida plugins ni seguridad admin. |
| `robots.txt` | NOT_FOUND | `crm-public-checks.txt` | Responde pagina 404 de LiteSpeed; no bloquea webhook, pero conviene definir si se quiere controlar crawlers. |
| `wp-login.php` HEAD | PASS_WITH_RISK | `crm-public-checks.txt` | Responde HTTP/2 200 y setea una cookie de prueba de WordPress; 2FA/rate limit no validables publicamente. |
| `xmlrpc.php` HEAD | PASS_WITH_RISK | `crm-public-checks.txt` | Responde HTTP/2 405 con `Allow: POST`; si XML-RPC no se usa, debe protegerse o desactivarse. |

## 4. Checklist manual WordPress/FluentCRM

| Area | Item | Estado | Evidencia requerida | Bloquea webhook v1 |
| --- | --- | --- | --- | --- |
| WordPress / seguridad | HTTPS activo | CONFIRMED | `crm-public-checks.txt`, `crm-tls-basic.txt` | Si falla, si |
| WordPress / seguridad | WordPress actualizado | NOT_VALIDATED | Captura/version interna sin secretos | Si |
| WordPress / seguridad | FluentCRM Pro activo | NOT_VALIDATED | wp-admin plugin status o licencia activa, sin exponer license key | Si |
| WordPress / seguridad | FluentSMTP activo | NOT_VALIDATED | wp-admin plugin status | Si |
| WordPress / seguridad | Admin 2FA activo | NOT_VALIDATED | Politica/captura de 2FA sin datos sensibles | Si |
| WordPress / seguridad | Usuarios admin minimos | NOT_VALIDATED | Lista revisada por operador, sin emails privados en docs | Si |
| WordPress / seguridad | Plugins minimos | NOT_VALIDATED | Lista revisada por operador | No, salvo plugin riesgoso |
| WordPress / seguridad | Backups CRM configurados | NOT_VALIDATED | Evidencia externa de backup/restore plan | Si |
| WordPress / seguridad | XML-RPC desactivado o protegido si no se usa | PENDING | `xmlrpc.php` permite POST; confirmar desactivacion/proteccion | Si |
| WordPress / seguridad | Login attempts limitados | NOT_VALIDATED | Plugin/WAF/rate-limit confirmado | Si |
| WordPress / seguridad | WAF/firewall si disponible | NOT_VALIDATED | Regla o proveedor confirmado | No, recomendado |
| FluentCRM | Lista `JAKAWI Owners` creada | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Lista `JAKAWI Trials` creada | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Lista `JAKAWI Paid Owners` creada | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Lista `JAKAWI Onboarding` creada | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Lista `JAKAWI Leads/Signals Owners` creada | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Lista `JAKAWI Partners/Future` creada | NOT_VALIDATED | Captura/listado interno | No |
| FluentCRM | Tags `jakawi_*` creados o listos | NOT_VALIDATED | Captura/listado interno | Si |
| FluentCRM | Secuencia Welcome Owner creada en draft | NOT_VALIDATED | Secuencia en draft o desactivada | Si |
| FluentCRM | Sin campanas activas a clientes reales sin aprobacion | NOT_VALIDATED | Revision de automations/campaigns | Si |
| FluentCRM | Contactos test marcados QA o eliminados | NOT_VALIDATED | Revision interna sin PII en docs | No |

## 5. Checklist FluentSMTP/AWS SES

| Area | Item | Estado | Evidencia requerida | Bloquea webhook v1 |
| --- | --- | --- | --- | --- |
| FluentSMTP / AWS SES | AWS SES conectado | NOT_VALIDATED | FluentSMTP connection test interno, sin keys | Si para envio real |
| FluentSMTP / AWS SES | Dominio/email verificado | NOT_VALIDATED | SES identity status o DNS verificado | Si para envio real |
| FluentSMTP / AWS SES | DKIM OK | NOT_VALIDATED | DNS/SES status | Si para envio real |
| FluentSMTP / AWS SES | SPF OK | NOT_VALIDATED | DNS record revisado | Si para envio real |
| FluentSMTP / AWS SES | DMARC OK | NOT_VALIDATED | DNS record revisado | Si para envio real |
| FluentSMTP / AWS SES | SES fuera de sandbox o plan claro | NOT_VALIDATED | SES account status o plan de salida | Si para clientes reales |
| FluentSMTP / AWS SES | From name definido: JAKAWI | NOT_VALIDATED | Configuracion FluentSMTP/FluentCRM | No |
| FluentSMTP / AWS SES | From email definido | NOT_VALIDATED | Configuracion interna, sin passwords | Si para envio real |
| FluentSMTP / AWS SES | Reply-to definido: `soporte@jakawi.com` o equivalente | NOT_VALIDATED | Configuracion interna | No |
| FluentSMTP / AWS SES | Bounce/complaint handling definido | NOT_VALIDATED | SNS/SES/FluentCRM/runbook externo | Si para envio real |
| FluentSMTP / AWS SES | Reputation monitoreada | NOT_VALIDATED | Dashboard/alerta operacional | No, recomendado |

## 6. Checklist Webhook/Endpoint

| Area | Item | Estado | Evidencia requerida | Bloquea webhook v1 |
| --- | --- | --- | --- | --- |
| Webhook / integracion | Incoming webhook o endpoint definido | NOT_VALIDATED | Nombre del mecanismo sin URL secreta | Si |
| Webhook / integracion | URL guardada fuera del repo | NOT_VALIDATED | Confirmacion del operador, sin valor real | Si |
| Webhook / integracion | Secret creado fuera del repo | NOT_VALIDATED | Confirmacion del operador, sin valor real | Si |
| Webhook / integracion | Si FluentCRM no valida HMAC, bridge/plugin requerido | PENDING | Decision tecnica documentada | Si |
| Webhook / integracion | Endpoint puede aplicar tags/listas por evento | NOT_VALIDATED | Prueba fake sin datos reales | Si |
| Webhook / integracion | Endpoint puede manejar idempotencia por `event_id` | NOT_VALIDATED | Prueba repetida con evento fake | Si |
| Webhook / integracion | Se probo evento fake sin datos reales | NOT_VALIDATED | Evidencia externa redacted | Si |
| Webhook / integracion | No se pegaron payloads con PII en docs | CONFIRMED | Revision de este reporte y runbook | Si falla, si |

## 7. Decision GO/NO-GO

NO-GO para implementar `JAKAWI CRM Event Webhook v1` en este momento.

Criterios GO que si estan confirmados:

- `crm.jakawi.com` responde por HTTPS.
- TLS basico valido.
- `jakawi.com/api/health` responde OK.
- JAKAWI sigue documentado como fuente de verdad; CRM no debe manejar auth, password reset, tokens, pagos, planes ni leads como verdad.

Criterios GO pendientes:

- FluentCRM Pro confirmado por operador.
- FluentSMTP/AWS SES configurado o, como minimo, endpoint CRM listo para prueba sin envio real.
- Webhook/bridge definido y protegido.
- Secret fuera del repo.
- Politica de PII aceptada para payload minimo.
- Secuencias iniciales en draft o desactivadas mientras se prueba.

GO limitado podria aprobarse solo despues de confirmar CRM instalado, endpoint/secret seguro y prueba fake sin PII. Si SES sigue pendiente, no enviar emails reales; usar el sprint `CRM Webhook Endpoint Verification v1` antes de tocar codigo JAKAWI.

NO-GO absoluto si cualquiera de estos puntos se confirma:

- CRM no responde HTTPS.
- wp-admin sin 2FA o sin proteccion basica.
- No hay secret/endpoint.
- Se pretende enviar campanas reales sin SES/consentimiento.
- Se pretende usar CRM como fuente de verdad de owners, pagos, planes, leads, auth o tokens.

## 8. Hallazgos priorizados

| ID | Severidad | Area | Hallazgo | Evidencia | Mitigacion | Bloquea siguiente sprint |
| --- | --- | --- | --- | --- | --- | --- |
| CRMV-001 | HIGH | FluentCRM / ops | FluentCRM Pro, listas, tags y secuencias no estan validados por evidencia disponible. | Sin acceso wp-admin; checklist manual pendiente. | Operador debe confirmar plugin, listas, tags `jakawi_*` y secuencias en draft/desactivadas. | Si |
| CRMV-002 | HIGH | Webhook / seguridad | No hay endpoint, URL externa, secret, HMAC/bridge ni idempotencia confirmados. | Checklist webhook en estado `NOT_VALIDATED`/`PENDING`. | Definir endpoint seguro, guardar URL/secret fuera del repo, validar firma o bridge, probar evento fake sin PII. | Si |
| CRMV-003 | HIGH | SMTP / deliverability | FluentSMTP/AWS SES, dominio/email, DKIM, SPF, DMARC, sandbox, bounces y complaints no estan validados. | Sin acceso a wp-admin/SES; checklist SMTP pendiente. | Confirmar SES y DNS antes de cualquier envio real a clientes. | Si para envio real |
| CRMV-004 | MEDIUM | WordPress / seguridad | `wp-login.php` es publico y `xmlrpc.php` declara `Allow: POST`; 2FA, rate limit y proteccion XML-RPC no estan confirmados. | `crm-public-checks.txt`. | Activar 2FA, limitar intentos, revisar usuarios admin, desactivar/proteger XML-RPC si no se usa. | Si para webhook v1 si wp-admin queda inseguro |
| CRMV-005 | LOW | Crawlers / higiene | `robots.txt` devuelve 404. | `crm-public-checks.txt`. | Crear `robots.txt` si se quiere controlar indexacion/crawlers; no incluir secretos. | No |

## 9. Proximo paso recomendado

A. `CRM Webhook Endpoint Verification v1`

Elegido porque el dominio HTTPS ya responde y el siguiente bloqueo tecnico es validar, sin datos reales, como entraran eventos desde JAKAWI hacia FluentCRM o hacia un bridge seguro. Antes de ejecutar ese sprint, el operador debe completar las confirmaciones manuales criticas de WordPress/FluentCRM/SMTP y asegurar que no haya campanas reales activas sin aprobacion.
