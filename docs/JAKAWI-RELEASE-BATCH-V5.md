# JAKAWI Release Batch v5

## Resultado

PASS.

Se desplego a produccion **Owner UX Polish v1** y **Deploy Safety Runbook v1** desde el commit local `2406dba22acde3b378f8bba6932ee1fc3966cc46`. No se hizo push.

El release uso obligatoriamente `scripts/deploy-preflight.sh` antes de build/deploy. El deploy se ejecuto con `.env.stack` cargado en el mismo shell de `docker stack deploy`, para evitar repetir la incidencia de Release Batch v4.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v5/20260708-035229`
- Repo: `/var/opt/jakawi.com`
- Commit desplegado: `2406dba22acde3b378f8bba6932ee1fc3966cc46`
- Tag de entrada en HEAD: `deploy-safety-runbook-v1`
- Imagen construida: `jakawi-com-web:latest`
- Image ID: `sha256:01422f2501903213b6cf315841e38a7112060d745fefc5c005ff8e6fb090ea30`
- Servicio actualizado: `jakawi_com_web`

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/git-log-oneline-decorate-15.txt`
- `evidence/git-tags-points-at-head.txt`
- `evidence/deploy-preflight-redacted.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint.txt`
- `evidence/prisma-migrate-status.txt`
- `evidence/prisma-migrate-status-with-stack-env.txt`
- `evidence/prisma-migrate-status-container.txt`
- `evidence/final-flags-redacted.txt`
- `evidence/docker-build.txt`
- `evidence/docker-image-id.txt`
- `evidence/docker-stack-deploy.txt`
- `evidence/docker-service-converged.txt`
- `evidence/docker-service-logs-tail-120.txt`
- `evidence/post-deploy-smoke-results.txt`

## Cambios Incluidos

- Owner UX Polish v1.
- Deploy Safety Runbook v1.
- Nuevo preflight obligatorio: `scripts/deploy-preflight.sh`.

## Preflight

- Working tree inicial: limpio.
- `git rev-parse HEAD`: `2406dba22acde3b378f8bba6932ee1fc3966cc46`.
- `git tag --points-at HEAD`: `deploy-safety-runbook-v1`.
- `test -f docs/DEPLOY-SAFETY-RUNBOOK-V1.md`: PASS.
- `test -x scripts/deploy-preflight.sh`: PASS.
- `bash -n scripts/deploy-preflight.sh`: PASS.
- `scripts/deploy-preflight.sh`: PASS.
- Salida del preflight: redacted, sin valores secretos.

## Validaciones

- `npm run test --if-present`: PASS, 94 tests passed.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS con 23 warnings existentes de `<img>`/`next/image`.
- `npx prisma migrate status` en host sin `.env.stack`: WARN, fallo por `DATABASE_URL` ausente en entorno host.
- `npx prisma migrate status` en host con `.env.stack`: WARN, el host no pudo completar la consulta contra `postgres:5432`.
- `npx prisma migrate status` en contenedor runtime: PASS, database schema is up to date.
- Migraciones pendientes: none.
- `prisma migrate deploy`: no ejecutado.

## Deploy

- Variables criticas cargadas desde `.env.stack` antes de `docker stack deploy`: confirmado, sin imprimir valores secretos.
- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: PASS.
- Estado final: `jakawi_com_web` `1/1`, `UpdateStatus=completed`.
- `docker service logs jakawi_com_web --tail 120`: guardado en evidencia.

## Smoke Results

- `https://jakawi.com`: 200.
- `https://jakawi.com/api/health`: 200, database ok.
- `https://jakawi.com/login`: 200.
- `https://jakawi.com/registro`: 200.
- `https://jakawi.com/app`: 307, `Location: /login`.
- `https://jakawi.com/app/integraciones`: 307, `Location: /login`.
- `https://jakawi.com/qa-onboarding-store`: 200.
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`: 200.

## Flags Finales

```text
CRM_WEBHOOK_ENABLED=false
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
EMAIL_DELIVERY_MODE=disabled
APP_ENCRYPTION_KEY_present=yes
SESSION_SECRET_present=yes
DATABASE_URL_present=yes
```

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
- No secretos impresos en el reporte.
- No migraciones Prisma aplicadas.
- No se ejecuto `docker stack deploy` sin `.env.stack` cargado.

## Riesgos / Notas

- El host no tiene `DATABASE_URL` disponible por defecto para Prisma, y aun cargando `.env.stack` la ruta de red `postgres:5432` es propia del runtime/container. La comprobacion autoritativa de migraciones se hizo dentro del contenedor web existente.
- Lint conserva 23 warnings existentes de `<img>`/`next/image`; no bloquean este release.
- El preflight nuevo cubre presencia de variables criticas, pero no ejecuta deploy ni imprime valores.

## Siguiente Hito Recomendado

- Owner Authenticated QA v1.
- Lint Warning Cleanup v1.
