# First-party Tracking Foundation v1

## Objetivo

First-party Tracking Foundation v1 crea la base interna para medir eventos de JAKAWI y de tiendas sin enviar datos a redes externas ni CRM.

Regla madre:

```text
JAKAWI puede medir JAKAWI.
Cada tienda puede medir su propio espacio comercial.
No mezclar audiencias ni leads/clientes de tiendas con audiencias de JAKAWI.
```

## Separacion PLATFORM vs STORE

`PLATFORM` representa eventos propios de JAKAWI como producto/plataforma SaaS. Puede registrar actividad de landing, registro, trials, pagos operativos y partners.

`STORE` representa eventos dentro del espacio comercial de una tienda. Puede registrar vistas, interacciones con Seller AI, WhatsApp, leads e intencion comercial de esa tienda.

La capa interna valida que un evento `jakawi_*` no se escriba con scope `STORE`, y que un evento de tienda no se escriba con scope `PLATFORM`.

## Eventos Definidos

Eventos `PLATFORM`:

- `jakawi_landing_view`
- `jakawi_signup_started`
- `jakawi_owner_registered`
- `jakawi_store_created`
- `jakawi_trial_started`
- `jakawi_payment_pending`
- `jakawi_payment_confirmed`
- `jakawi_partner_click`
- `jakawi_partner_signup`

Eventos `STORE`:

- `store_view`
- `product_view`
- `seller_ai_opened`
- `seller_ai_message`
- `seller_ai_handoff`
- `whatsapp_click`
- `lead_created`
- `contactable_lead`
- `high_intent_signal`

## Cookies e IDs

Cookies first-party:

- `jakawi_visitor_id`: identificador anonimo de visitante.
- `jakawi_journey_id`: identificador anonimo de journey.
- `jakawi_visitor_session`: cookie legacy cliente que se sigue leyendo por compatibilidad.

Configuracion:

- `SameSite=Lax`
- `Secure` en produccion
- `jakawi_visitor_id` expira aproximadamente en 365 dias
- `jakawi_journey_id` expira aproximadamente en 30 dias

Los IDs no identifican a una persona por si solos. Si no existe lead o user, el evento queda anonimo.

## Consentimiento Basico

Estructura:

- `necessary`
- `analytics`
- `marketing`

Default seguro:

```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false
}
```

`canTrackMarketing()` devuelve `false` por default. Marketing queda reservado para un hito futuro con configuracion/consentimiento explicito.

## Modelo Prisma

Este hito agrega `TrackingEvent` con:

- `eventId` unico para dedupe futuro browser pixel + CAPI.
- `scope` (`PLATFORM` o `STORE`).
- `eventName`.
- IDs opcionales: `storeId`, `productId`, `userId`, `leadId`, `visitorId`, `journeyId`.
- contexto: `source`, `path`, `referrer`, `userAgent`, `ipHash`.
- consentimiento: `consentNecessary`, `consentAnalytics`, `consentMarketing`.
- `metadata`, `occurredAt`, `createdAt`.

No se guarda IP plano. Si se captura IP de request, se guarda hash.

Migracion local:

```text
app/prisma/migrations/000022_add_first_party_tracking_events
```

No se ejecuto `migrate deploy` en este hito.

## Que se Cableo

- `trackEvent()` sigue escribiendo la tabla existente `AnalyticsEvent` para no romper dashboards actuales.
- `trackEvent()` tambien escribe `TrackingEvent` con scope `STORE` para:
  - `STORE_VIEW` -> `store_view`
  - `PRODUCT_VIEW` -> `product_view`
  - `WHATSAPP_CLICK` -> `whatsapp_click`
- `/api/visitor` retorna y setea `visitorId` / `journeyId` first-party sin exponer IP.
- `/api/seller-ai/events` refleja eventos seguros de Seller AI en `TrackingEvent` con scope `STORE`.
- `/api/seller-ai/lead` registra `lead_created` con scope `STORE`.

Helpers disponibles:

- `createTrackingEventId()`
- `getOrCreateVisitorId()`
- `getOrCreateJourneyId()`
- `parseConsent()`
- `canTrackAnalytics()`
- `canTrackMarketing()`
- `trackInternalEvent()`

## Que NO se Hizo

- No Pixel.
- No CAPI.
- No Meta API.
- No TikTok API.
- No Google API.
- No CRM.
- No Cloudflare API nueva.
- No tracking externo.
- No self-service de configuracion de pixels por tienda.
- No banner completo de consentimiento.
- No deploy.
- No push.
- No secrets.

## Como Probar

Pruebas locales:

```bash
cd /var/opt/jakawi.com/app
npx prisma validate
npx prisma generate
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

Pruebas funcionales con API local:

1. Abrir `/api/visitor`.
2. Confirmar que la respuesta incluye `visitorId` y `journeyId`.
3. Confirmar cookies `jakawi_visitor_id` y `jakawi_journey_id`.
4. Visitar una tienda publicada y un producto.
5. Confirmar que `AnalyticsEvent` sigue recibiendo eventos legacy.
6. Confirmar que `TrackingEvent` recibe eventos `STORE` con `eventId`, `visitorId`/`journeyId` si existian cookies, y `consentMarketing=false`.

No usar tokens, pixels ni endpoints externos para esta prueba.

## Siguiente Hito

Store Pixel Settings v1:

- crear configuracion por tienda para pixels externos.
- separar consentimiento analytics vs marketing.
- preparar envio browser/server con `eventId` compartido.
- mantener audiencias de JAKAWI y audiencias de tiendas separadas.
