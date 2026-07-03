# CRM Webhook Controlled QA Send v1

Fecha: 2026-07-02
Repo: `/var/opt/jakawi.com`
Commit probado: `734ec22c36fe4ce1ae62a679c871253a4e4e0d91`
Endpoint efectivo: `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`
Resultado final: `PASS`

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-230801`
- Summary JSON: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-230801/evidence/crm-webhook-controlled-qa-summary.json`
- Preflight: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-230801/evidence/preflight.txt`
- Busqueda del bridge: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-230801/evidence/crm-bridge-plugin-search.txt`
- Estado final seguro: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-230801/evidence/final-safe-state.txt`

## Resultado

El envio QA controlado quedo bloqueado antes de rotar secret, antes de cambiar `.env.stack` y antes de invocar el endpoint protegido de JAKAWI.

Motivo del bloqueo:

```text
No se pudo confirmar de forma segura el mecanismo real para guardar el Shared Secret en el CRM Bridge.
```

Durante la inspeccion, el path esperado del plugin no estuvo disponible en este host:

```text
/home/crm.jakawi.com/public_html/wp-content/plugins/jakawi-crm-bridge
```

Tampoco se encontro `wp` CLI disponible ni una copia local del plugin CRM Bridge bajo el WordPress local inspeccionado en `/var/www/drenvex_data/wp`.

## Evento QA

- Evento previsto: `qa.crm_webhook.test`
- Email QA reservado: `qa-crm-webhook-test@example.com`
- Eventos enviados: `0`
- HTTP status: `not_applicable`
- Eventos reales enviados: `no`

## Seguridad

- Secret rotado: `no`
- Secret expuesto: `no`
- Secret guardado en docs: `no`
- Secret guardado en commits: `no`
- Screenshots con secret: `no`
- `.env.stack` modificado: `no`
- `.env.stack` versionado: `no`
- Deploy de codigo: `no`
- Push: `no`

## Estado CRM Bridge

No se pudo confirmar el estado actual del CRM Bridge desde este host porque no hubo acceso seguro al plugin/opciones.

Estado requerido antes de reintentar:

| Flag | Valor requerido |
| --- | --- |
| Enabled | `true` |
| Dry Run | `true` |
| Allow Contact Mutation | `false` |
| Allow QA Events Only | `true` |

## Estado final seguro

No se aplicaron cambios productivos ni de configuracion. El sistema quedo sin envio QA ejecutado.

Estado observado de `.env.stack` tras el bloqueo:

| Variable | Estado observado |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | no configurada |
| `CRM_WEBHOOK_SECRET` | no presente |
| `CRM_WEBHOOK_QA_ONLY` | no configurada |

## Mutaciones

- Contactos mutados: `no`
- Emails enviados: `0`
- Campanas activas modificadas: `no`
- Secuencias activas modificadas: `no`

Estas conclusiones corresponden al alcance de esta tarea: el envio se bloqueo antes de cualquier request firmada al CRM Bridge.

## Pendientes

Para reintentar `CRM Webhook Controlled QA Send v1` hace falta uno de estos caminos seguros:

1. Proveer acceso local/operativo al plugin CRM Bridge real en `crm.jakawi.com`.
2. Proveer el comando WP-CLI exacto y verificado para actualizar el option name correcto, sin imprimir secrets.
3. Ejecutar manualmente la rotacion del Shared Secret en el panel admin del CRM Bridge y confirmar el fingerprint seguro, sin revelar el valor.

Siguiente fase sugerida solo despues de un PASS de esta QA:

```text
CRM Webhook Real Event Dry-Run Pilot v1
```

## Retry after manual secret rotation

Fecha: 2026-07-02
Repo: `/var/opt/jakawi.com`
Commit probado: `ad43d0b615b76a28cd274e5d7ce240ea007fd7c1`
Fingerprint CRM Bridge: `sha256:0c1def321111`
QA_DIR: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-234413`
Resultado: `BLOCKED`

El secret fue confirmado como presente en `.env.stack` sin imprimir su valor. Se aplico un reload minimo de configuracion al servicio `jakawi_com_web` para habilitar temporalmente solo el modo QA:

```text
CRM_WEBHOOK_ENABLED=true
CRM_WEBHOOK_QA_ONLY=true
```

La llamada autenticada al endpoint protegido se intento una unica vez con una sesion superadmin temporal creada con token aleatorio y eliminada al finalizar. La sesion resolvio contra un usuario `SUPER_ADMIN`, pero el servicio respondio `404` antes de generar `event_id`.

Motivo del bloqueo:

```text
La imagen en ejecucion de jakawi_com_web no contiene POST /api/admin/crm-webhook/qa-test.
No se hizo build ni deploy de codigo por alcance explicito de la tarea.
```

Evidencia:

- Summary JSON: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-234413/evidence/crm-webhook-controlled-qa-summary.json`
- Preflight redacted: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-234413/evidence/preflight-redacted.txt`
- Respuesta QA redacted: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-234413/evidence/qa-send-response-redacted.txt`
- Estado final seguro: `/var/backups/jakawi.com/qa/crm-webhook-controlled-qa-send-v1/20260702-234413/evidence/final-safe-state-redacted.txt`

Resultado de la llamada:

- Evento objetivo: `qa.crm_webhook.test`
- Eventos enviados al CRM Bridge: `0`
- HTTP status del endpoint JAKAWI: `404`
- HTTP status CRM Bridge: `not_applicable`
- `event_id`: `not_created`
- Eventos reales habilitados: `no`
- Contactos mutados: `no`
- Emails enviados: `0`
- Secret expuesto: `no`

Estado final seguro:

```text
CRM_WEBHOOK_ENABLED=false
CRM_WEBHOOK_QA_ONLY=true
CRM_WEBHOOK_SECRET=present
```

No hubo deploy, no hubo push, no se modifico Prisma y no se enviaron eventos reales.

## Final PASS

Fecha: 2026-07-03
Repo: `/var/opt/jakawi.com`
Resultado final: `PASS`

CRM Bridge confirmado:

- Host real: `crm.jakawi.com`
- Endpoint: `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`
- Cambio minimo aplicado en CRM Bridge: `/home/crm.jakawi.com/public_html/wp-content/plugins/jakawi-crm-bridge/includes/class-jakawi-crm-bridge-security.php`
- Evento agregado a allowlist: `qa.crm_webhook.test`
- Campos permitidos: `qa`, `source_flow`

Regla QA-only para `qa.crm_webhook.test`:

- `qa=true`
- `email=qa-crm-webhook-test@example.com`
- `attribution_type=QA` o `source_flow=QA`

Verificacion:

| Check | Resultado |
| --- | --- |
| PHP lint | `PASS` |
| Bridge Self-Test | `PASS status 200` |

Settings finales del CRM Bridge:

| Setting | Valor |
| --- | --- |
| `enabled` | `true` |
| `dry_run` | `true` |
| `allow_qa_events_only` | `true` |
| `allow_contact_mutation` | `false` |

Unico POST QA firmado:

| Campo | Valor |
| --- | --- |
| `event_id` | `qa-crm-webhook-test-1783042115-bdec4931` |
| `crm_http_status` | `200` |
| `sent` | `true` |
| `invalid_signature` | `no` |
| `event_not_allowed` | `no` |
| `contacts_mutated` | `no` |
| `emails_sent` | `0` |

Bridge response:

| Campo | Valor |
| --- | --- |
| `ok` | `true` |
| `dry_run` | `true` |
| `contact_mutation` | `false` |
| `duplicate` | `false` |

Estado final JAKAWI confirmado:

| Variable | Estado |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | `false` |
| `CRM_WEBHOOK_QA_ONLY` | `true` |
| `CRM_WEBHOOK_SECRET` | presente, valor no mostrado |

Seguridad y alcance:

- App code modificado: `no`
- Deploy: `no`
- Push: `no`
- Prisma: `no`
- Secret expuesto en docs: `no`
- Secret expuesto en commit: `no`
