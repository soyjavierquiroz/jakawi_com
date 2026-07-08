# TikTok Pixel Settings v1

## Objetivo

TikTok Pixel Settings v1 prepara configuracion TikTok por tienda usando el modelo existente `StorePixelIntegration`, sin inyectar TikTok Pixel browser y sin enviar eventos externos.

Este hito solo deja lista la configuracion operativa para un hito futuro. La medicion first-party sigue viviendo en JAKAWI y no se llama a TikTok.

## Plataforma TIKTOK

`StorePixelIntegration` ya soporta:

```text
StorePixelPlatform = META | TIKTOK | GOOGLE
StorePixelStatus = DRAFT | ACTIVE | DISABLED | ERROR
```

Para TikTok se usa:

```text
platform=TIKTOK
```

La regla sigue siendo una integracion por tienda y plataforma:

```text
storeId + platform
```

## Que se Puede Guardar

Desde `/app/integraciones`, TikTok permite guardar:

- Pixel ID TikTok.
- `browserPixelEnabled` como preparacion futura.
- `capiEnabled` como preparacion futura.
- `accessTokenEncrypted` opcional si `APP_ENCRYPTION_KEY` existe.
- `testEventCode` como codigo de prueba equivalente para uso futuro.
- `status` en `DRAFT`, `ACTIVE`, `DISABLED` o `ERROR`.

TikTok se puede guardar como `DRAFT`. El Pixel ID se valida de forma razonable como identificador alfanumerico de 10 a 40 caracteres.

## Seguridad de Tokens

Los access tokens no se muestran despues de guardar.

Si se ingresa un token y `APP_ENCRYPTION_KEY` esta configurada, se guarda cifrado en:

```text
StorePixelIntegration.accessTokenEncrypted
```

Si `APP_ENCRYPTION_KEY` no existe, la accion rechaza el token con error controlado.

`capiEnabled=true` para TikTok no se permite sin Pixel ID y sin token cifrado. Si el token se borra, CAPI vuelve a quedar apagado.

## Consentimiento Futuro

TikTok Pixel Browser v1 debera respetar consentimiento marketing antes de renderizar scripts o enviar eventos browser-side.

TikTok Events API futuro debera respetar consentimiento marketing antes de enviar eventos server-side.

Este hito no conecta TikTok con Consent Banner v1 porque todavia no existe runtime TikTok.

## Que NO Hace

- No TikTok Pixel browser.
- No TikTok Events API.
- No eventos externos.
- No inyecta scripts de TikTok.
- No llama TikTok API.
- No crea QA de TikTok.
- No toca Meta QA.
- No agrega CRM.
- No agrega Google.
- No agrega Cloudflare.
- No deploy.
- No push.
- No pagos.
- No emails.
- No secrets.

## Como Probar

Desde `/var/opt/jakawi.com/app`:

```bash
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

Validaciones de documento:

```bash
cd /var/opt/jakawi.com
test -f docs/TIKTOK-PIXEL-SETTINGS-V1.md
grep -q "TikTok Pixel Settings v1" docs/TIKTOK-PIXEL-SETTINGS-V1.md
grep -q "TikTok Pixel Browser v1" docs/TIKTOK-PIXEL-SETTINGS-V1.md
git diff --check
git status --short
```

## Siguiente Hito

TikTok Pixel Browser v1:

- renderizar TikTok Pixel solo para tiendas con `platform=TIKTOK`, configuracion activa y consentimiento marketing.
- usar eventos first-party como fuente local.
- mantener separadas las audiencias de tienda y de JAKAWI.
- no activar TikTok Events API hasta un hito separado.
