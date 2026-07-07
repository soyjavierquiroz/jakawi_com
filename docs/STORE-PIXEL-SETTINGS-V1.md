# Store Pixel Settings v1

## Objetivo

Store Pixel Settings v1 permite preparar configuracion de pixels e integraciones de marketing por tienda, sin enviar eventos todavia.

Regla madre:

```text
JAKAWI puede medir JAKAWI.
Cada tienda puede medir su propio espacio comercial.
No mezclar audiencias ni leads/clientes de tiendas con audiencias de JAKAWI.
```

## Separacion Tienda vs JAKAWI

Las integraciones creadas en `/app/integraciones` pertenecen a una tienda concreta. La configuracion de una tienda no debe alimentar audiencias de JAKAWI plataforma ni de otra tienda.

Este hito solo guarda preparacion operativa. La medicion interna first-party sigue viviendo en `TrackingEvent`; los vendors externos quedan apagados.

## Modelo Prisma

Se agrega:

```text
StorePixelPlatform = META | TIKTOK | GOOGLE
StorePixelStatus = DRAFT | ACTIVE | DISABLED | ERROR
```

Modelo:

```text
StorePixelIntegration
- id
- storeId
- platform
- pixelId
- accessTokenEncrypted
- capiEnabled
- browserPixelEnabled
- testEventCode
- status
- lastTestedAt
- createdAt
- updatedAt
```

Regla unica:

```text
storeId + platform
```

Migracion local:

```text
app/prisma/migrations/000023_add_store_pixel_integrations
```

No se ejecuto `migrate deploy`.

## Env

`app/.env.example` incluye:

```env
APP_ENCRYPTION_KEY=
```

La key debe ser base64 o hex y decodificar exactamente a 32 bytes para AES-256-GCM.

Si `APP_ENCRYPTION_KEY` no esta configurada:

- se puede guardar `pixelId`
- no se aceptan access tokens
- CAPI no puede activarse sin token cifrado

## UI

Ruta owner:

```text
/app/integraciones
```

Permite preparar:

- Meta Pixel
- TikTok Pixel
- Google futuro/preparado

Campos visibles:

- Pixel ID
- Browser Pixel enabled
- CAPI enabled
- Test Event Code
- Status
- Access token opcional

El token no se muestra despues de guardarlo.

## Que se Puede Guardar

En v1:

- Meta Pixel ID
- TikTok Pixel ID
- Google ID preparado
- Test Event Code
- estado `DRAFT`, `ACTIVE`, `DISABLED` o `ERROR`
- flags `browserPixelEnabled` y `capiEnabled`

Aunque `browserPixelEnabled=true`, no se inyecta script todavia. Solo queda guardado para el hito de activacion.

`capiEnabled=true` requiere access token cifrado. Sin `APP_ENCRYPTION_KEY`, la accion devuelve error controlado.

## Seguridad de Tokens

Los tokens no se guardan en texto plano.

El helper server-side usa AES-256-GCM y lee solo:

```env
APP_ENCRYPTION_KEY
```

No se deben registrar tokens en docs, logs, capturas ni evidencia QA. El campo de UI es tipo password y queda vacio despues de guardar.

## Que NO se Hace

- No Pixel browser.
- No CAPI.
- No Meta API.
- No TikTok API.
- No Google API.
- No CRM.
- No envio de eventos externos.
- No scripts externos.
- No deploy.
- No push.
- No secrets.

## Como Probar

Validaciones locales:

```bash
cd /var/opt/jakawi.com/app
npx prisma validate
npx prisma generate
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

Prueba funcional sin key:

1. Entrar a `/app/integraciones`.
2. Guardar un Meta Pixel ID valido.
3. Confirmar que queda en estado `DRAFT`.
4. Intentar guardar token o activar CAPI sin `APP_ENCRYPTION_KEY`.
5. Confirmar error controlado y ningun token guardado.

Prueba funcional con key controlada:

1. Configurar `APP_ENCRYPTION_KEY` solo en entorno seguro.
2. Guardar token.
3. Confirmar que se conserva como `accessTokenEncrypted`.
4. Confirmar que el valor cifrado no contiene el token plano.
5. No activar ningun envio externo en este hito.

## Siguiente Hito

Meta Pixel Browser v1:

- inyectar script browser solo para tiendas con configuracion habilitada.
- respetar consentimiento marketing.
- usar `eventId` de la base first-party para dedupe futuro.
- mantener separadas las audiencias de tienda y de JAKAWI.
