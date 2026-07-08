# Consent Banner v1

## Objetivo

Consent Banner v1 agrega un gestor basico de consentimiento first-party para visitantes publicos de JAKAWI. Permite guardar preferencias sin bloquear la navegacion y sin cargar scripts externos desde el banner.

## Cookie

La cookie usada es `jakawi_tracking_consent`.

Formato:

```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false,
  "updatedAt": "2026-07-08T00:00:00.000Z"
}
```

La cookie es first-party, se escribe con `SameSite=Lax`, `Path=/`, max-age razonable, y `Secure` en produccion.

## Defaults

Si no hay cookie valida, JAKAWI usa el default seguro:

- `necessary=true`
- `analytics=true`
- `marketing=false`

Marketing es opt-in explicito. La opcion "Solo necesarias" guarda `analytics=false` y `marketing=false`.

## Relacion Con Meta Pixel/CAPI

Meta Pixel Browser v1 solo se renderiza cuando `marketing=true` y la configuracion Meta de la tienda esta activa.

Meta CAPI v1 solo envia cuando el evento first-party tiene `consentMarketing=true`. Si `marketing=false`, CAPI queda bloqueado por consentimiento.

## Que No Hace

- No es un CMP legal completo.
- No llama Meta API.
- No ejecuta Meta CAPI QA.
- No integra TikTok ni Google.
- No agrega CRM.
- No maneja pagos, emails, secretos, deploys ni pushes.

## Como Probar

Desde `/var/opt/jakawi.com/app`:

```bash
npm run test --if-present
npm run typecheck --if-present
npm run lint --if-present
```

Validacion manual:

1. Abrir una pagina publica sin `jakawi_tracking_consent`.
2. Confirmar que el banner aparece y no bloquea la navegacion.
3. Guardar "Solo necesarias" y verificar `marketing=false`, `analytics=false`.
4. Reabrir "Privacidad", guardar "Aceptar todo" y verificar `marketing=true`.
5. Confirmar que Meta Pixel no aparece con `marketing=false` y solo aparece con `marketing=true` mas configuracion Meta activa.

## Siguiente Hito

Cuando existan credenciales controladas, retomar Meta CAPI Controlled QA v1. Alternativamente, avanzar con TikTok Pixel Settings v1.
