# Owner Integration Copy Sanitization v1

## Objetivo

Corregir el WARN de Owner Authenticated QA v1 en `/app/integraciones`, evitando que el owner vea nombres internos sensibles o tecnicos como `APP_ENCRYPTION_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `accessTokenEncrypted` o `Access token CAPI`.

## Resultado

WARN corregido en UI/copy local.

La ruta de integraciones ahora usa textos owner-safe para explicar el estado de Browser Pixel, eventos del servidor y token privado, sin cambiar la logica de tokens, cifrado, flags, activacion de integraciones ni APIs externas.

## Textos Reemplazados

| Antes | Ahora |
| --- | --- |
| `APP_ENCRYPTION_KEY=configurada/no configurada` | `Cifrado del servidor activo/pendiente` |
| `Access token CAPI` | `Token privado de eventos` |
| `CAPI global apagado por seguridad.` | `Eventos del servidor apagados por seguridad.` |
| `Falta token de acceso guardado.` | `Falta guardar el token privado de eventos.` |
| `CAPI` como control owner-facing | `Eventos del servidor` |

Tambien se ajustaron ayudas contextuales:

- Browser Pixel: mide desde el navegador con consentimiento marketing.
- Eventos del servidor: preparado/apagado hasta configuracion segura.
- Token privado: nunca se muestra despues de guardar.

## Que No Se Cambio

- No se cambio la logica de cifrado.
- No se cambio el modelo Prisma ni se aplicaron migraciones.
- No se activaron integraciones.
- No se llamo a Meta, TikTok, Google, Cloudflare, CRM, pagos ni email.
- No se cambio el manejo interno de `accessTokenEncrypted`.
- No se cambiaron flags de runtime.
- No hubo deploy ni push.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/owner-integration-copy-sanitization-v1/20260708-095551`
- Before map: `evidence/sensitive-copy-map-before.txt`
- After map: `evidence/sensitive-copy-map-after.txt`
- Validaciones: `evidence/npm-test.txt`, `evidence/npm-typecheck.txt`, `evidence/npm-lint.txt`, `evidence/git-diff-check.txt`

## Validaciones

- `npm run test --if-present`: PASS.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS con warnings existentes de `<img>`/`next/image`.
- `git diff --check`: PASS.
- Doc existe: PASS.
- Titulo contiene `Owner Integration Copy Sanitization v1`: PASS.
- Referencia `APP_ENCRYPTION_KEY` documentada como string sanitizado: PASS.
- Siguiente hito `Owner Authenticated QA v1 retry` documentado: PASS.

## Strings Internas Restantes

El mapa posterior conserva menciones internas no renderizadas y/o tests:

- `app/src/app/(dashboard)/app/integraciones/page.tsx`: `accessTokenEncrypted` en `select` Prisma para calcular si existe token guardado.
- `app/src/lib/store-pixel-integrations.ts`, `app/src/lib/integration-status.ts`, `app/src/lib/pixels/meta-capi.ts`: campos internos y logica de cifrado/token.
- Tests existentes de integraciones/cifrado: referencias deliberadas a `APP_ENCRYPTION_KEY`, `accessTokenEncrypted` y casos de seguridad.
- `app/src/lib/integration-owner-copy.test.ts`: lista de terminos prohibidos para asegurar que el helper owner-facing no los devuelva.

No quedan como texto visible owner-facing en `/app/integraciones`.

## Siguiente Hito Recomendado

- Owner Authenticated QA v1 retry.
- Release Batch v6.
