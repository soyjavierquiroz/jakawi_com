# Meta CAPI Controlled QA v1

## Resultado

BLOCKED.

La QA controlada no se ejecuto porque faltan credenciales QA requeridas para Meta:

- Meta Pixel ID QA: missing.
- Meta CAPI access token QA: missing.
- `test_event_code`: missing; recomendado para Events Manager.

La regla de esta tarea exige detener si falta Pixel ID QA o token CAPI QA. No se activo Meta CAPI, no se creo/actualizo una integracion Meta, y no se enviaron eventos.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/meta-capi-controlled-qa-v1/20260708-013312`
- Repo: `/var/opt/jakawi.com`
- Commit local al iniciar esta corrida: `f7657974febde02e8157db957ee8742246d6dd08`
- Runtime publico: `https://jakawi.com/api/health` respondio OK con database ok.
- Runtime `TrackingEvent`: present.
- Runtime `StorePixelIntegration`: present.
- Runtime `META_CAPI_ENABLED` inicial: `false`.
- Runtime `META_CAPI_ENABLED` final: `false`.

Archivos de evidencia saneada:

- `git-state.txt`
- `git-status-short.txt`
- `health.json`
- `runtime-schema-tables.txt`
- `runtime-env-redacted-before.txt`
- `env-key-presence.txt`
- `store-meta-integration-presence.csv`
- `controlled-events-since-qa-start.csv`
- `final-meta-capi-enabled.txt`

## Tienda QA

- Store slug: `qa-onboarding-store`
- Producto: `qa-producto-demo`
- Store QA existe en runtime: yes.
- Integracion META para store QA: no.
- Pixel ID present: no.
- Access token encrypted present: no.
- Browser Pixel enabled: no.
- CAPI enabled: no.
- `test_event_code` present: no.
- Token expuesto: no.

## Configuracion CAPI

Runtime final redacted:

```text
CRM_WEBHOOK_ENABLED=false
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
META_CAPI_GRAPH_VERSION=v20.0
META_CAPI_TIMEOUT_MS=5000
EMAIL_DELIVERY_MODE=disabled
APP_ENCRYPTION_KEY_present=yes
```

No se configuro temporalmente `META_CAPI_ENABLED=true` porque faltan Pixel ID QA y token CAPI QA.

## Eventos Probados

No se ejecuto el flujo controlado.

- `store_view` -> `PageView`: BLOCKED, faltan Pixel ID QA y token CAPI QA.
- `product_view` -> `ViewContent`: BLOCKED, faltan Pixel ID QA y token CAPI QA.

No se hicieron GETs controlados a:

- `https://jakawi.com/qa-onboarding-store`
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`

Consulta desde el inicio de esta corrida:

- `store_view`: 0 eventos creados.
- `product_view`: 0 eventos creados.

## Status CAPI Por Evento

- `PageView`: not executed.
- `ViewContent`: not executed.
- `metadata.metaCapi`: not created in this QA run.
- `event_id`: none used in this QA run.
- Token expuesto: no.
- Email/phone/external_id enviados: no.

## Controles

- No CRM.
- No TikTok.
- No Google.
- No Cloudflare.
- No pagos.
- No emails reales.
- No deploy.
- No push.
- No secretos en docs/evidencia saneada.
- No eventos masivos.
- No Pixel/CAPI QA enviado.
- Final `META_CAPI_ENABLED=false`.

## Pendientes

- Proveer Meta Pixel ID QA sin imprimirlo en output.
- Proveer Meta CAPI access token QA sin imprimirlo en output.
- Proveer `test_event_code` de Events Manager si esta disponible.
- Crear/actualizar `StorePixelIntegration` META para `qa-onboarding-store` con token cifrado.
- Reintentar el flujo controlado con consentimiento marketing y apagar CAPI al final.
