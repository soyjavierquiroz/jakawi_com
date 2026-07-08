# JAKAWI Release Batch v9

## Estado

PASS con WARN visual.

El deploy de `Product/Storefront Polish v1` fue aplicado en produccion y las rutas publicas QA respondieron correctamente. La validacion visual con browser queda como WARN porque el host no tiene `agent-browser`, Playwright ni Chromium disponibles.

## QA_DIR

`/var/backups/jakawi.com/qa/jakawi-release-batch-v9/20260708-130326`

## Commit desplegado

`f93972fad9ea4e10a4c25c86f54abffa09004399`

Tag previo incluido en HEAD:

- `product-storefront-polish-v1`

## Image ID

Build:

`sha256:12b1924b1789508812d2310c87298cd416b856a983902247e756446d862bc545`

Activo en contenedor final:

`sha256:12b1924b1789508812d2310c87298cd416b856a983902247e756446d862bc545`

Image id activo verificado: yes.

## Cambios incluidos

Product/Storefront Polish v1:

- Header/hero de tienda mas claro.
- WhatsApp/CTA mas visible.
- Estado vacio accionable.
- Cards de producto mas limpias.
- Precio destacado.
- Badges/fallback sin imagen.
- Pagina producto con CTA/layout mas robusto.

## Validaciones

- `scripts/deploy-preflight.sh`: PASS.
- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS.
- Lint warnings final: 0 visibles.

## Prisma

`prisma migrate status` fue validado desde el contenedor runtime `jakawi_com_web`.

- 23 migrations encontradas.
- Database schema is up to date.
- No habia migraciones pendientes reales.
- No se ejecuto `prisma migrate deploy`.

## Deploy

- `.env.stack` cargado antes de `docker stack deploy`.
- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: PASS.
- `docker service update --force jakawi_com_web`: usado porque el task no se recreo con `stack deploy` y el image id activo previo no coincidia.
- Service final: `jakawi_com_web 1/1`.
- UpdateStatus final: `completed`.
- Env-add manual needed: no.

## Smoke publico

| Ruta | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, `database: ok` |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/app` | 307 -> `/login` |
| `https://jakawi.com/app/integraciones` | 307 -> `/login` |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## Validacion visual post-deploy

WARN: no se pudo ejecutar browser real porque no estaban disponibles:

- `agent-browser`
- Playwright
- Chromium/Chrome

Validacion fallback por HTML publico:

- Storefront contiene: `Tienda verificada`, `WhatsApp`, `Precio`, `Destacado`, `Ver productos`, `Quiero este producto`, `Producto`, `QA`.
- Pagina producto contiene: `WhatsApp`, `Precio`, `Detalle`, `Destacado`, `Te ayudo a elegir`, `Consultar por WhatsApp`, `qa-producto-demo`, `QA`.
- Secret marker check: PASS.

Pendiente recomendado: captura visual mobile/desktop con browser disponible.

## Flags finales

- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `META_CAPI_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- `DATABASE_URL_present=yes`
- `SESSION_SECRET_present=yes`
- `APP_ENCRYPTION_KEY_present=yes`

## Controles

- No push.
- No CRM.
- No Meta QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No CAPI QA.
- No pagos.
- No emails reales.
- No secrets impresos.
- No `docker service update --env-add`.

## Siguiente hito recomendado

- Beta Readiness QA v1.
- Meta CAPI Controlled QA si llegan credenciales.
