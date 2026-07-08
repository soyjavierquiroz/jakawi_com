# Meta CAPI Controlled QA v1

## Resultado

BLOCKED.

La QA controlada no se ejecuto porque el runtime publico no contiene Meta CAPI v1. `https://jakawi.com` responde 200, y las rutas QA de tienda/producto responden 200, pero la imagen web en ejecucion no expone evidencia de codigo CAPI v1 y la base runtime no contiene las tablas `TrackingEvent` ni `StorePixelIntegration`.

Motivo bloqueante: deploy/migracion requerida. No se hizo deploy.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/meta-capi-controlled-qa-v1/20260708-010629`
- Repo: `/var/opt/jakawi.com`
- HEAD local al iniciar esta corrida: `d8730240e4d3ccef791bc0dd6800e6bbf50b8db5`
- Tags locales en HEAD al iniciar esta corrida: `meta-capi-controlled-qa-v1`
- Commit base Meta CAPI v1 existente en repo: `d13f87234e59df037d8ddc3dc0353ffba1893b38`
- Tag local Meta CAPI v1: `meta-capi-v1`
- Runtime publico: `https://jakawi.com` respondio 200
- Runtime contiene Meta CAPI v1: no
- Runtime `TrackingEvent`: no
- Runtime `StorePixelIntegration`: no

Archivos de evidencia saneada:

- `git-state.txt`
- `runtime-status.txt`
- `env-key-presence.txt`
- `runtime-env-key-presence.txt`
- `runtime-capi-presence.txt`
- `browser-pixel-observed.txt`

## Tienda QA

- Store slug: `qa-onboarding-store`
- Producto: `qa-producto-demo`
- Storefront QA respondio 200
- Producto QA respondio 200
- Store QA publicada en runtime: yes
- Producto QA visible en runtime: yes

## Configuracion CAPI

- `.env.stack` `APP_ENCRYPTION_KEY`: missing
- `.env.stack` `META_CAPI_ENABLED`: missing; efectivo false por default del codigo local/runtime actual
- `.env.stack` `META_CAPI_GRAPH_VERSION`: missing; default local `v20.0`
- `.env.stack` `META_CAPI_TIMEOUT_MS`: missing; default local `5000`
- Runtime `APP_ENCRYPTION_KEY`: missing
- Runtime `META_CAPI_ENABLED`: missing; final `META_CAPI_ENABLED=false` efectivo
- Runtime `META_CAPI_GRAPH_VERSION`: missing
- Runtime `META_CAPI_TIMEOUT_MS`: missing

No se activo `META_CAPI_ENABLED=true` temporal porque el runtime no contiene Meta CAPI v1 y la regla de QA exige bloquear con "deploy required".

## Integracion Meta QA

- StorePixelIntegration META en runtime: unavailable; tabla ausente
- Pixel ID present: no
- Access token encrypted present: no
- CAPI enabled: no
- Browser Pixel enabled: no
- test_event_code usado: no
- test_event_code present: no
- Token expuesto: no

BLOCKED: Meta Pixel ID / CAPI token / test_event_code required for controlled QA.

## Eventos Probados

No se envio CAPI.

- `store_view` -> `PageView`: BLOCKED, runtime sin `TrackingEvent`/CAPI
- `product_view` -> `ViewContent`: BLOCKED, runtime sin `TrackingEvent`/CAPI

Se hicieron GETs controlados a las rutas QA para verificar disponibilidad:

- `https://jakawi.com/qa-onboarding-store`
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`

## Status CAPI Por Evento

- `store_view`: not executed; blocked before enabling CAPI
- `product_view`: not executed; blocked before enabling CAPI
- `metadata.metaCapi`: unavailable; runtime sin `TrackingEvent`
- `event_id`: unavailable en runtime; no se pudo crear `TrackingEvent`

## Browser Pixel

- Browser Pixel observed en storefront HTML: no
- Browser Pixel observed en product HTML: no

Esto es consistente con runtime sin `StorePixelIntegration` y sin consentimiento marketing aplicado a una integracion Meta activa.

## Controles

- No CRM
- No TikTok
- No Google
- No Cloudflare
- No pagos
- No emails reales
- No push
- No deploy
- No secretos en docs/evidencia
- No se uso Pixel de JAKAWI para tienda
- No eventos masivos
- Final `META_CAPI_ENABLED=false` efectivo

## Pendientes

- Desplegar `meta-capi-v1` y migraciones asociadas antes de reintentar QA.
- Configurar `APP_ENCRYPTION_KEY` en runtime sin imprimir valor.
- Configurar temporalmente `META_CAPI_ENABLED=true`, `META_CAPI_GRAPH_VERSION=v20.0` y `META_CAPI_TIMEOUT_MS=5000` solo durante la QA.
- Provisionar StorePixelIntegration META para `qa-onboarding-store` con Pixel ID QA, token CAPI cifrado y `test_event_code` si esta disponible.
- Reintentar un unico flujo QA con consentimiento marketing controlado y apagar CAPI al final.
