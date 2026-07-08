# Meta CAPI v1

Meta CAPI v1 agrega envío server-side de eventos Meta por tienda usando `StorePixelIntegration` y `TrackingEvent`.

## Separación JAKAWI vs tienda

JAKAWI puede medir JAKAWI. Cada tienda mide su propio espacio comercial. CAPI solo usa la integración `META` de la tienda dueña del `TrackingEvent`; no usa pixel ni token de JAKAWI para eventos de tiendas, y no mezcla audiencias, leads ni clientes entre tiendas.

## Env vars

```env
META_CAPI_ENABLED=false
META_CAPI_GRAPH_VERSION=v20.0
META_CAPI_TIMEOUT_MS=5000
```

Los access tokens no van en env. Cada token vive cifrado en `StorePixelIntegration.accessTokenEncrypted` con `APP_ENCRYPTION_KEY`.

## Requisitos para enviar

- `META_CAPI_ENABLED=true`
- `StorePixelIntegration` de la tienda con `platform=META` y `status=ACTIVE`
- `capiEnabled=true`
- `pixelId` presente
- token cifrado presente
- consentimiento marketing presente en `TrackingEvent.consentMarketing=true`

El default seguro queda apagado con `META_CAPI_ENABLED=false`.

## Eventos soportados

- `store_view` -> `PageView`
- `product_view` -> `ViewContent`
- `whatsapp_click` -> `Contact`
- `lead_created` -> `Lead`
- `seller_ai_handoff` -> `Contact`

`ViewContent` incluye `content_ids`, `content_name`, `currency` y `value` cuando esos datos existen en metadata segura del evento.

## Dedupe con eventID

Meta Pixel Browser v1 y Meta CAPI v1 comparten el mismo `TrackingEvent.eventId`. Browser envía `eventID`; CAPI envía `event_id` con ese mismo valor para deduplicación.

## Seguridad y PII

El token se descifra solo server-side justo antes del envío. No se devuelve al cliente, no se registra en logs, no se guarda en docs/tests y no se persiste el payload completo.

User data v1 envía solo datos seguros disponibles:

- `client_user_agent` si existe
- no envía `email`
- no envía `phone`
- no envía `external_id` en v1
- `fbp`/`fbc` quedan omitidos hasta que existan cookies dedicadas

Mejor menos datos que mezclar o filtrar PII.

## Test Event Code

Si `StorePixelIntegration.testEventCode` existe, CAPI lo incluye como `test_event_code` para pruebas controladas en Meta Events Manager.

## Qué NO hace

- No TikTok
- No Google
- No CRM
- No Cloudflare
- No pagos
- No emails reales
- No usa Pixel de JAKAWI para tiendas

## Cómo probar local

Usar tests con `fetch` mockeado. El mock debe validar:

- URL `https://graph.facebook.com/{version}/{pixelId}/events`
- `event_id` igual a `TrackingEvent.eventId`
- `test_event_code` cuando existe
- ausencia de token en resultados, errores y metadata
- fallos 4xx/5xx sin romper UX

## Siguiente hito

Meta CAPI Controlled QA v1.
