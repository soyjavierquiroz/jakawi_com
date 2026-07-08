# Integration Status Dashboard v1

## Objetivo

Integration Status Dashboard v1 mejora `/app/integraciones` para mostrar el estado operativo de integraciones por tienda sin ejecutar envios externos.

El dashboard cubre:

- Meta Pixel Browser.
- Meta CAPI.
- TikTok Pixel Browser.
- TikTok Events API futuro/preparado.
- Google como proveedor preparado/no implementado.
- Requisito de consentimiento marketing.

## Estados Mostrados

Cada plataforma muestra un estado rapido:

- `Listo`: al menos una superficie implementada esta operativa para la tienda.
- `Configurado pero apagado`: existe configuracion guardada, pero alguna bandera operativa la mantiene apagada.
- `Falta configuración`: falta Pixel ID, token u otra configuracion necesaria.
- `No implementado`: el proveedor o superficie todavia no tiene implementacion operativa.

Tambien muestra:

- Pixel ID presente: si/no.
- Browser Pixel enabled: si/no.
- Browser Pixel operativo: si/no.
- CAPI o Events API enabled/preparado: si/no.
- CAPI o Events API operativo: si/no.
- Token presente: si/no.
- Test Event Code presente: si/no.
- Consentimiento marketing requerido: si/no.

## Razones De Bloqueo

Las razones se muestran como texto operativo estable:

- `integration missing`
- `status not ACTIVE`
- `pixelId missing`
- `browserPixelEnabled false`
- `capiEnabled false`
- `access token missing`
- `global META_CAPI_ENABLED false`
- `consent marketing required`
- `provider not implemented`

`consent marketing required` es una condicion transversal: los eventos externos solo se envian si la integracion esta activa y el visitante acepto marketing.

## Seguridad De Tokens

El helper `app/src/lib/integration-status.ts` no retorna `accessTokenEncrypted` ni valores de token. Solo retorna `tokenPresent=true/false`.

La UI puede mostrar que existe un token cifrado, pero nunca muestra el token ni su valor cifrado.

## Que NO Hace

- No envia eventos.
- No llama APIs externas.
- No llama Meta API.
- No llama TikTok API.
- No implementa Google.
- No ejecuta Meta QA.
- No ejecuta TikTok QA.
- No agrega CRM.
- No maneja pagos, emails, secretos, deploys ni pushes.

## Siguiente Hito

Cuando existan credenciales controladas, retomar Meta CAPI Controlled QA v1.

Alternativamente, avanzar con TikTok Events API v1 cuando haya credenciales.
