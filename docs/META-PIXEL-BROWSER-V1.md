# Meta Pixel Browser v1

## Objetivo

Meta Pixel Browser v1 activa Meta Pixel browser-side por tienda usando `StorePixelIntegration`, sin CAPI y sin enviar eventos de tiendas al pixel de JAKAWI.

Regla madre:

```text
JAKAWI puede medir JAKAWI.
Cada tienda mide su propio espacio comercial.
No mezclar audiencias ni leads/clientes de tiendas con audiencias de JAKAWI.
```

## Separacion JAKAWI vs Tienda

El Pixel que se inyecta en storefront pertenece a la tienda resuelta por slug, subdominio o dominio custom. No se usa un Pixel de JAKAWI para eventos de tienda.

Las paginas plataforma de `jakawi.com` no cambian tracking ni cargan pixels de tiendas.

## Requisitos Para Activar

Para renderizar Meta Pixel en storefront, la tienda debe tener:

- `StorePixelIntegration.platform=META`
- `StorePixelIntegration.status=ACTIVE`
- `browserPixelEnabled=true`
- `pixelId` presente
- consentimiento `marketing=true`

Si cualquiera de esas condiciones falta, no se inyecta script.

## Consentimiento

El render usa la cookie first-party:

```text
jakawi_tracking_consent
```

El valor se parsea con el helper de consentimiento first-party. El default seguro sigue siendo:

```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false
}
```

Por eso, sin consentimiento explicito de marketing, Meta Pixel no se renderiza. En produccion esto queda preparado para Consent Banner v1 o un flujo equivalente.

## Eventos Browser Soportados

Storefront:

- `PageView` para vista de tienda, asociado al evento interno `store_view`.

Producto:

- `ViewContent` para vista de producto, asociado al evento interno `product_view`.

`ViewContent` incluye:

- `content_ids`
- `content_name`
- `content_type=product`
- `currency`
- `value`

## eventID

El `eventID` enviado a Meta usa el `eventId` creado por `TrackingEvent` interno.

Esto deja preparada la deduplicacion futura con CAPI sin habilitar CAPI todavia.

## Test Event Code

`testEventCode` queda guardado en `StorePixelIntegration`, pero este hito no lo envia. Se documenta asi para evitar mezclar configuracion browser con CAPI hasta definir el flujo de QA controlado.

## Que NO Hace

- No CAPI.
- No Meta API server-side.
- No `graph.facebook.com`.
- No access tokens en cliente.
- No TikTok.
- No Google.
- No CRM.
- No Pixel de JAKAWI para eventos de tiendas.
- No deploy.
- No push.
- No secrets.

## Como Probar Con Tienda QA

1. En `/app/integraciones`, configurar Meta Pixel para una tienda QA:
   - `platform=META`
   - `status=ACTIVE`
   - `browserPixelEnabled=true`
   - `pixelId` valido
2. Asegurar consentimiento marketing en una cookie controlada:

```text
jakawi_tracking_consent={"necessary":true,"analytics":true,"marketing":true}
```

3. Abrir la ruta publica de la tienda.
4. Confirmar que el HTML/chunk contiene `connect.facebook.net/en_US/fbevents.js` y el pixelId de esa tienda.
5. Abrir un producto y confirmar `ViewContent`.
6. Confirmar que no hay llamadas server-side a Meta ni uso de `accessTokenEncrypted`.

Prueba negativa:

- Quitar consentimiento marketing o cambiar `status` a `DRAFT`.
- Confirmar que no se renderiza Meta Pixel.

## Siguiente Hito

Meta CAPI v1:

- usar `eventID` compartido con browser.
- leer token cifrado solo en servidor.
- respetar consentimiento marketing.
- mantener separadas audiencias de tiendas y JAKAWI.
