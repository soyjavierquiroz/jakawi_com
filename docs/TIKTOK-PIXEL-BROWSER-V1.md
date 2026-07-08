# TikTok Pixel Browser v1

## Objetivo

TikTok Pixel Browser v1 activa TikTok Pixel browser-side por tienda usando `StorePixelIntegration`, sin TikTok Events API y sin enviar eventos de tiendas a cuentas de JAKAWI.

Regla madre:

```text
JAKAWI puede medir JAKAWI.
Cada tienda puede medir su propio espacio comercial.
No mezclar audiencias ni leads/clientes de tiendas con audiencias de JAKAWI.
```

## Separacion JAKAWI vs Tienda

El Pixel que se inyecta en storefront pertenece a la tienda resuelta por slug, subdominio o dominio custom.

No se usa un Pixel de JAKAWI para eventos de tienda. Las paginas plataforma de `jakawi.com` no cargan pixels de tiendas.

## Requisitos Para Activar

TikTok Pixel solo se renderiza cuando la tienda cumple todo:

- `StorePixelIntegration.platform=TIKTOK`
- `StorePixelIntegration.status=ACTIVE`
- `browserPixelEnabled=true`
- `pixelId` presente
- consentimiento marketing `true`

Si no hay consentimiento marketing, no se inyecta script TikTok aunque la integracion este activa.

## Eventos Browser

Storefront:

- `store_view` first-party -> TikTok `PageView`

Producto:

- `product_view` first-party -> TikTok `ViewContent`

`ViewContent` envia parametros seguros de producto:

- `content_ids`
- `content_name`
- `content_type=product`
- `currency`
- `value`

Cuando existe `TrackingEvent.eventId`, se pasa como `event_id` en el evento browser para preparar deduplicacion futura.

## Consentimiento

TikTok Pixel Browser v1 usa la misma cookie first-party de Consent Banner v1:

```text
jakawi_tracking_consent
```

Default seguro:

```text
marketing=false
```

Con `marketing=false`, el helper server-side devuelve `null` y el componente TikTok no se renderiza.

## Seguridad

El helper server-side devuelve solo datos seguros para cliente:

- `pixelId`

No expone:

- `accessTokenEncrypted`
- access tokens
- secrets
- datos personales

No hay llamadas server-side a TikTok.

## Que NO Hace

- No TikTok Events API.
- No server-side TikTok.
- No Meta.
- No Meta CAPI.
- No Google.
- No CRM.
- No pagos.
- No emails.
- No Cloudflare.
- No deploy.
- No push.
- No secrets.
- No usa Pixel de JAKAWI para tiendas.

## Como Probar Con Tienda QA

Desde `/app/integraciones`, configurar una tienda QA con:

- plataforma `TIKTOK`
- Pixel ID TikTok de prueba
- `status=ACTIVE`
- `browserPixelEnabled=true`

Validacion manual:

1. Abrir storefront sin `jakawi_tracking_consent`.
2. Confirmar que no se renderiza TikTok Pixel porque `marketing=false`.
3. Aceptar marketing desde el banner.
4. Reabrir storefront y confirmar que se carga TikTok Pixel con el Pixel ID de la tienda.
5. Abrir un producto y confirmar evento `ViewContent`.
6. Confirmar que paginas plataforma como `/`, `/login` o `/registro` no cargan pixels de tiendas.

Validaciones locales:

```bash
cd /var/opt/jakawi.com/app
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

## Siguiente Hito

TikTok Events API v1:

- definir credenciales por tienda.
- enviar eventos server-side solo con consentimiento marketing.
- usar `event_id` compartido con browser para deduplicacion.
- mantener separado JAKAWI plataforma de cada tienda.
