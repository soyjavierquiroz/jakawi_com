# JAKAWI Release Batch v7

## Resultado

PASS.

Se desplego a produccion Deploy Safety Runbook v1.1, Owner Catalog Management QA v1 docs y Lint Warning Cleanup v1. El servicio `jakawi_com_web` quedo `1/1`, con update `completed`, y el contenedor activo quedo usando la imagen construida para este batch.

WARN operativo corregido: `docker stack deploy` no recreo el task por el tag local `jakawi-com-web:latest` y la spec del stack no lista algunas variables runtime criticas. Se ejecuto `docker service update --force` y luego `docker service update --env-add` con `.env.stack` cargado. La spec final quedo alineada con las flags requeridas, sin imprimir secretos.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v7/20260708-114043`
- Repo: `/var/opt/jakawi.com`
- Commit desplegado: `c1459050ca7cea0639cfecf514e60696471f504b`
- Tags en commit desplegado: `lint-warning-cleanup-v1`
- Image id desplegado: `sha256:883d505de97790e5806a6a6e91cb9a4dc331fa4ce2f96f5d87ce503ed26ab229`
- Deploy preflight: `scripts/deploy-preflight.sh` ejecutado y guardado redacted.

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/git-log-oneline-decorate-20.txt`
- `evidence/git-tags-points-at-head.txt`
- `evidence/deploy-preflight-redacted.txt`
- `evidence/env-stack-critical-redacted.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint.txt`
- `evidence/prisma-migrate-status-before-deploy.txt`
- `evidence/docker-build.txt`
- `evidence/docker-image-id.txt`
- `evidence/docker-stack-deploy.txt`
- `evidence/docker-service-update-force.txt`
- `evidence/docker-service-update-env-add-critical.txt`
- `evidence/docker-service-ps.txt`
- `evidence/docker-update-status.json`
- `evidence/service-image-compare-final.txt`
- `evidence/service-spec-critical-env-redacted-final.txt`
- `evidence/env-stack-vs-service-spec-critical-redacted-final.txt`
- `evidence/docker-service-logs-tail-120.txt`
- `evidence/post-deploy-smoke.txt`

## Cambios Incluidos

- Deploy Safety Runbook v1.1: `509ca4b50d07381c0a7f9cf065513b4823a60e41`.
- Owner Catalog Management QA v1 docs: `e0537e863fd5441015b2f4b92d1fc102913eaf1a`.
- Lint Warning Cleanup v1: `c1459050ca7cea0639cfecf514e60696471f504b`.

## Lint Warning Cleanup v1

- Warnings `@next/next/no-img-element` antes: 23.
- Warnings `@next/next/no-img-element` despues: 0.
- `<img>` en `src` antes: 23.
- `<img>` en `src` despues: 0.
- `npm run lint --if-present`: PASS, sin warnings.

## Preflight y Validaciones

- Working tree inicial: limpio.
- Runbook presente: `docs/DEPLOY-SAFETY-RUNBOOK-V1.md`.
- `scripts/deploy-preflight.sh`: presente, ejecutable, `bash -n` PASS.
- `scripts/deploy-preflight.sh`: PASS redacted, sin valores secretos impresos.
- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS, 0 warnings.
- Migraciones pendientes: none. Se valido desde runtime y Prisma reporto `Database schema is up to date!`.
- `migrate deploy`: no ejecutado porque no habia migraciones pendientes reales.

## Deploy

- `.env.stack` fue cargado antes de `docker stack deploy`.
- Variables criticas confirmadas solo redacted: present/missing o flags booleanos, sin valores secretos.
- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: ejecutado.
- `docker service update --force jakawi_com_web`: ejecutado porque el task no se recreo con el stack deploy y el image id activo no coincidia aun con el build nuevo.
- `docker service update --env-add`: ejecutado para restaurar variables runtime criticas que no estan listadas en `infra/docker-stack.yml`.
- `jakawi_com_web`: `1/1`.
- UpdateStatus final: `completed`.
- Image id del contenedor activo: coincide con la imagen construida para este batch.

## Smoke Publico

| Ruta | Resultado |
| --- | --- |
| `https://jakawi.com` | 200 |
| `https://jakawi.com/api/health` | 200, database `ok` |
| `https://jakawi.com/login` | 200 |
| `https://jakawi.com/registro` | 200 |
| `https://jakawi.com/app` | 307 login |
| `https://jakawi.com/app/integraciones` | 307 login |
| `https://jakawi.com/qa-onboarding-store` | 200 |
| `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` | 200 |

## Flags Finales

- `CRM_WEBHOOK_ENABLED=false`
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
- No mutaciones destructivas.
- Deploy permitido y ejecutado.

## Riesgos y Notas

- `infra/docker-stack.yml` aun no lista `APP_ENCRYPTION_KEY`, `CUSTOM_DOMAINS_ENABLED`, `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`, `META_CAPI_ENABLED` ni `EMAIL_DELIVERY_MODE`. El runtime final se corrigio con `docker service update --env-add`, pero un futuro `docker stack deploy` puede requerir repetir esta correccion o actualizar el stack file en un cambio separado.
- No se activaron integraciones externas ni envios reales.

## Siguiente Hito Recomendado

- Meta CAPI Controlled QA si llegan credenciales.
- Product/Storefront Polish v1.
