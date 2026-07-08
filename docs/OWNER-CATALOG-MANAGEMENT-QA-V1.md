# Owner Catalog Management QA v1

## Resultado

PASS.

Se valido en produccion que el owner QA puede operar el catalogo basico desde `/app/productos` con sesion temporal segura: listar, crear, editar, ocultar, restaurar visibilidad y borrar un producto QA controlado. El storefront publico respondio segun lo esperado y el producto base `qa-producto-demo` no fue tocado.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/owner-catalog-management-qa-v1/20260708-103047`
- Repo: `/var/opt/jakawi.com`
- HEAD validado: `509ca4b51ced82f3d91a91f99b871aaf9a5e572b`
- Usuario QA: `qa-owner-onboarding@example.com`
- Store QA: `qa-onboarding-store`
- Producto base QA: `qa-producto-demo`
- Producto QA creado: `QA Producto Catalog V1`
- Slug creado: `qa-producto-catalog-v1`
- Sesion owner QA temporal segura: yes.
- Cookie usada: `jakawi_session`.
- Token/cookie/hash impresos: no.
- Token values exposed: no.

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/runtime-health.json`
- `evidence/deploy-preflight-redacted.txt`
- `evidence/service-spec-flags-redacted.txt`
- `evidence/qa-data-initial-state.json`
- `evidence/qa-product-preclean.json`
- `evidence/catalog-qa-summary.json`
- `evidence/catalog-status-codes.txt`
- `evidence/catalog-key-text-results.json`
- `evidence/catalog-secret-scan.json`
- `evidence/qa-product-created-state.json`
- `evidence/qa-product-edited-state.json`
- `evidence/qa-product-hidden-state.json`
- `evidence/qa-product-restored-state.json`
- `evidence/qa-product-after-ui-delete-state.json`
- `evidence/qa-product-cleanup.json`
- `evidence/qa-session-create.json`
- `evidence/qa-session-delete.json`
- `evidence/screenshots/`

## Preflight

- Working tree inicial: limpio.
- `git rev-parse HEAD`: `509ca4b51ced82f3d91a91f99b871aaf9a5e572b`.
- `https://jakawi.com/api/health`: 200, database `ok`.
- QA owner existe: yes.
- QA store existe, pertenece al owner QA y esta publicada: yes.
- Producto base `qa-producto-demo`: existe, visible, destacado, precio `12300`, moneda `BOB`.
- Producto `qa-producto-catalog-v1` antes del flujo: no existia.
- `scripts/deploy-preflight.sh`: PASS redacted, sin imprimir valores.

## Flags Finales

Preflight redacted de `.env.stack`:

```text
DATABASE_URL=present
SESSION_SECRET=present
APP_ENCRYPTION_KEY=present
CRM_WEBHOOK_ENABLED=present
CUSTOM_DOMAINS_ENABLED=present
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=present
META_CAPI_ENABLED=present
EMAIL_DELIVERY_MODE=present
PASS deploy preflight
```

Service spec/runtime redacted observado para `jakawi_com_web`:

```text
CRM_WEBHOOK_ENABLED=false
DATABASE_URL_present=yes
SESSION_SECRET_present=yes
APP_ENCRYPTION_KEY_present=no
CUSTOM_DOMAINS_ENABLED_present=no
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED_present=no
META_CAPI_ENABLED_present=no
EMAIL_DELIVERY_MODE_present=no
```

Nota: esta QA no modifico flags ni stack. Los flags ausentes en service spec no fueron usados por el flujo de catalogo.

## Autenticacion

Se uso una sesion owner QA temporal segura:

- Se creo una sesion temporal para `qa-owner-onboarding@example.com`.
- La cookie se inyecto solo en Playwright como `jakawi_session`.
- No se imprimieron cookies, tokens ni hashes.
- La sesion temporal se elimino al final: `temporarySessionDeleted=1`, `temporarySessionRemaining=0`.

## Rutas Validadas

| Ruta | Resultado |
| --- | --- |
| `/app/productos` inicial | 200; `QA Producto Demo` visible; CTA `Agregar producto` visible; copy `Visible`/`Destacado` entendible |
| `/app/productos/nuevo` | Creacion UI autenticada PASS |
| `/app/productos?q=qa-producto-catalog-v1` despues de crear | 200; producto QA visible en listado owner |
| `/qa-onboarding-store/p/qa-producto-catalog-v1` despues de crear | 200 |
| `/qa-onboarding-store` despues de crear | 200; producto visible en storefront |
| `/app/productos/[productId]/editar` | Edicion UI autenticada PASS |
| `/qa-onboarding-store/p/qa-producto-catalog-v1` despues de editar | 200 |
| `/app/productos?filter=hidden&q=qa-producto-catalog-v1` | 200; producto oculto visible para owner en filtro `Ocultos` |
| `/qa-onboarding-store/p/qa-producto-catalog-v1` oculto | 404 esperado |
| `/qa-onboarding-store/p/qa-producto-catalog-v1` restaurado visible | 200 |
| `/qa-onboarding-store/p/qa-producto-catalog-v1` despues de borrar | 404 esperado |

## Mutaciones Realizadas

Todas las mutaciones fueron sobre datos QA:

1. Preclean seguro: `qa-producto-catalog-v1` no existia; no se borro nada.
2. Crear producto por UI autenticada:
   - Nombre: `QA Producto Catalog V1`.
   - Slug: `qa-producto-catalog-v1`.
   - Precio: `77` (`7700` centavos).
   - Moneda: `BOB`.
   - `visible=true`.
   - `destacado=false`.
3. Editar producto por UI autenticada:
   - Nombre: `QA Producto Catalog V1 Editado`.
   - Precio: `88` (`8800` centavos).
   - Slug conservado: `qa-producto-catalog-v1`.
4. Toggle visible por UI autenticada:
   - Oculto: DB `isVisible=false`.
   - Storefront detalle respondio `404`, esperado porque el storefront filtra productos ocultos.
   - Storefront listado omitio el producto, esperado.
5. Restaurar visible por UI autenticada:
   - DB `isVisible=true`.
   - Storefront detalle volvio a `200`.
6. Borrar producto por UI autenticada:
   - DB final: `qaProduct=null`.
   - Storefront detalle final: `404`.
   - Producto base `qa-producto-demo`: intacto.

## Storefront Result

PASS.

- Producto visible creado: detalle publico `200`.
- Producto visible editado: detalle publico `200`.
- Producto oculto: detalle publico `404` esperado y omitido del storefront.
- Producto restaurado visible: detalle publico `200`.
- Producto borrado al final: detalle publico `404` esperado.
- Storefront base no se rompio.

## Escaneo de Secretos / Tokens

- `DATABASE_URL`: no visible en paginas validadas.
- `SESSION_SECRET`: no visible en paginas validadas.
- `APP_ENCRYPTION_KEY`: no visible en paginas validadas.
- `accessTokenEncrypted`: no visible en paginas validadas.
- Token values exposed: no.

## Limpieza

- Producto QA creado `qa-producto-catalog-v1`: eliminado por UI autenticada.
- Safety cleanup posterior: `deleted=0`, porque la eliminacion UI ya habia dejado el producto ausente.
- Producto base `qa-producto-demo`: no tocado.
- Sesion temporal eliminada: `temporarySessionDeleted=1`, `temporarySessionRemaining=0`.
- No quedaron cookies/tokens/hashes impresos en evidencia saneada.

## Controles

- No deploy.
- No push.
- No APIs externas.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos.
- No emails reales.
- No secrets en docs/reporte.
- No datos reales de clientes.
- No Prisma migrate.
- Mutaciones solo sobre owner/store/product QA.
- Storefront publico consultado; estos GET pueden registrar analytics internos first-party de QA.

## Notas

- La automatizacion uso Playwright temporal instalado bajo `QA_DIR`, fuera del repo.
- El primer intento quedo bloqueado por el banner de consentimiento antes de guardar; no creo producto. Se repitio con consentimiento first-party `solo necesarias`, sin marketing, y el flujo completo paso.

## Siguiente Hito Recomendado

- Lint Warning Cleanup v1.
- Release Batch v7.
