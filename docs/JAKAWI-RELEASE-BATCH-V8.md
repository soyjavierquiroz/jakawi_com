# JAKAWI Release Batch v8

## Resultado

PASS.

Se desplego a produccion Docker Stack Env Alignment v1. El servicio `jakawi_com_web` quedo `1/1`, con update `completed`, y el contenedor activo quedo usando la imagen construida para este batch.

La verificacion especial de env alignment confirmo que `infra/docker-stack.yml` ya conserva las variables criticas del servicio web. No fue necesario ejecutar `docker service update --env-add`.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v8/20260708-120534`
- Repo: `/var/opt/jakawi.com`
- Commit desplegado: `b59b4843be41c25f65dbe35e8253a9cd07fb2f84`
- Image id desplegado: `sha256:05ee2f1910a286ba95e2825ac2fb5f41d4a64e6eb5adc6d11f8ac704cc237c07`
- Deploy preflight: `scripts/deploy-preflight.sh` ejecutado y guardado redacted.

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/git-log-oneline-decorate-20.txt`
- `evidence/git-tags-points-at-head.txt`
- `evidence/deploy-preflight-redacted.txt`
- `evidence/env-stack-critical-redacted-predeploy.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint.txt`
- `evidence/prisma-migrate-status.txt`
- `evidence/docker-build.txt`
- `evidence/docker-image-id.txt`
- `evidence/docker-stack-deploy.txt`
- `evidence/docker-service-ps-before-force.txt`
- `evidence/docker-update-status-before-force.json`
- `evidence/docker-service-update-force.txt`
- `evidence/docker-service-ps-final.txt`
- `evidence/docker-update-status-final.json`
- `evidence/docker-service-ls-final.txt`
- `evidence/docker-active-container-image-id-before-force.txt`
- `evidence/docker-active-container-image-id-final.txt`
- `evidence/service-spec-critical-env-redacted-final.txt`
- `evidence/post-deploy-smoke.txt`

## Cambios Incluidos

- Docker Stack Env Alignment v1: `b59b4843be41c25f65dbe35e8253a9cd07fb2f84`.
- Variables criticas versionadas en `infra/docker-stack.yml`:
  - `APP_ENCRYPTION_KEY`
  - `CUSTOM_DOMAINS_ENABLED`
  - `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`
  - `META_CAPI_ENABLED`
  - `EMAIL_DELIVERY_MODE`

## Preflight y Validaciones

- Working tree inicial: limpio.
- `infra/docker-stack.yml`: contiene `APP_ENCRYPTION_KEY`, `CUSTOM_DOMAINS_ENABLED`, `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`, `META_CAPI_ENABLED`, `EMAIL_DELIVERY_MODE`, `DATABASE_URL` y `SESSION_SECRET`.
- `scripts/deploy-preflight.sh`: PASS redacted, sin valores secretos impresos.
- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, 0 warnings.
- Migraciones pendientes: none. Se valido desde runtime y Prisma reporto `Database schema is up to date!`.
- `migrate deploy`: no ejecutado porque no habia migraciones pendientes reales.

## Deploy

- `.env.stack` fue cargado antes de `docker stack deploy`.
- Variables criticas confirmadas solo redacted antes del deploy.
- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: ejecutado.
- `docker service update --force jakawi_com_web`: no ejecutado porque el stack deploy recreo el task y el image id activo coincidio con el build nuevo.
- `docker service update --env-add`: no ejecutado.
- `jakawi_com_web`: `1/1`.
- UpdateStatus final: `completed`.
- Image id del contenedor activo: coincide con la imagen construida para este batch.

## Env Alignment

- Resultado: PASS.
- `DATABASE_URL_present=yes`
- `SESSION_SECRET_present=yes`
- `APP_ENCRYPTION_KEY_present=yes`
- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `META_CAPI_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- Env-add manual necesario: no.

## Smoke Publico

| Ruta | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, database `ok` |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/app` | 307 `/login` |
| `https://jakawi.com/app/integraciones` | 307 `/login` |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## Flags Finales

- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `META_CAPI_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- `APP_ENCRYPTION_KEY_present=yes`
- `SESSION_SECRET_present=yes`
- `DATABASE_URL_present=yes`

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
- No migraciones Prisma ejecutadas.
- No `docker service update --env-add`.
- Deploy permitido y ejecutado.

## Siguiente Hito Recomendado

- Product/Storefront Polish v1.
