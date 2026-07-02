# CRM Webhook Controlled QA Send v1

Fecha: 2026-07-02
Repo: `/var/opt/jakawi.com`
Commit probado: `734ec22c36fe4ce1ae62a679c871253a4e4e0d91`
Endpoint efectivo: `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events`
Resultado: `BLOCKED`

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
