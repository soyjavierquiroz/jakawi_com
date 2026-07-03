# JAKAWI Current State Snapshot v1

Fecha/hora UTC: `2026-07-03T01:42:09+00:00`

QA_DIR: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209`

## Repo

- Repo: `/var/opt/jakawi.com`
- Branch: `main`
- HEAD capturado: `6236d5f6e87e561c09a6ed4473d68916dcf7b3c9`
- Tags en HEAD capturado: `crm-webhook-controlled-qa-send-v1-pass`
- Estado git al capturar evidencia: limpio

## Tags locales relevantes

| Tag | Commit | Nota |
| --- | --- | --- |
| `crm-webhook-endpoint-verification-v1-docs` | `b25bc340` | `docs: close CRM webhook endpoint verification v1` |
| `crm-event-webhook-v1` | `734ec22c` | `feat: add CRM event webhook sender v1` |
| `crm-webhook-controlled-qa-send-v1-pass` | `6236d5f6` | `docs: record CRM webhook controlled QA pass` |

## Runtime

- Imagen activa de `jakawi_com_web`: `jakawi-com-web:latest`
- Servicio `jakawi_com_web`: `Running`
- Tarea activa observada: `jakawi_com_web.1` en `PameDocker2026`, `Running 43 minutes ago`
- Health basico `https://jakawi.com`: `HTTP/2 200`
- Health `https://jakawi.com/api/admin/crm-webhook/qa-test`: `HTTP/2 405`
- Lectura de la ruta QA CRM: esperado `405`, `401` o `403`; observado `405`, por tanto no es `404`.

## Estado seguro CRM

Estado observado de `.env.stack`, sin exponer secretos:

```text
CRM_WEBHOOK_ENABLED=false
CRM_WEBHOOK_QA_ONLY=true
CRM_WEBHOOK_SECRET=present-redacted
CRM_WEBHOOK_URL=https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events
```

| Variable | Estado |
| --- | --- |
| `CRM_WEBHOOK_ENABLED` | `false` |
| `CRM_WEBHOOK_QA_ONLY` | `true` |
| `CRM_WEBHOOK_SECRET` | `present-redacted` |
| `CRM_WEBHOOK_URL` | `https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events` |

Conclusion: el CRM queda seguro para retomar producto principal. El webhook esta apagado por defecto, limitado a QA cuando se habilite, con secret presente y endpoint CRM usando `index.php`.

## Ultimos hitos cerrados

- CRM Webhook Endpoint Verification v1: `PASS 10/10`
- CRM Event Webhook v1: implementado
- CRM Webhook Controlled QA Send v1: `PASS dry-run`

## Proximos hitos recomendados

- Product/Core Flow QA v1
- Owner Onboarding Flow v1
- Partner Flow v1
- CRM Real Event Dry-Run Pilot v1, mas adelante, no ahora

## Riesgos abiertos

- CRM sigue apagado por defecto.
- Eventos reales CRM aun no activados.
- Cualquier activacion CRM futura debe ser dry-run primero.

## Evidencia sanitizada

- Git: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/git-state.txt`
- Tags: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/relevant-tags.txt`
- Docker service: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/docker-service-jakawi-com-web.txt`
- Docker image: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/docker-service-jakawi-com-web-image.txt`
- Home HEAD: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/curl-home-head.txt`
- CRM QA route HEAD: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/curl-crm-qa-route-head.txt`
- CRM env redacted: `/var/backups/jakawi.com/qa/jakawi-current-state-v1/20260703-014209/evidence/env-stack-crm-redacted.txt`
