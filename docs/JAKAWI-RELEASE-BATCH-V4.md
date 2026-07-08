# JAKAWI Release Batch v4

## Resultado

PASS final, con incidencia operativa recuperada.

Se desplego a produccion **Integration Status Dashboard v1** desde el commit local cerrado. No se hizo push.

Durante el primer `docker stack deploy`, las variables de entorno del stack se sustituyeron vacias porque `.env.stack` no estaba cargado en el shell. Esto provoco reinicios temporales de `jakawi_com_web` por `DATABASE_URL` vacio. Se recupero cargando `.env.stack` en el entorno del proceso de deploy, se verifico `UpdateStatus=completed`, y se fijaron explicitamente flags no secretos finales en `jakawi_com_web`.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v4/20260708-032048`
- Repo: `/var/opt/jakawi.com`
- Commit desplegado: `f812714c2ff12ab2bab49fb415fa7341a62f4eed`
- Tag de entrada: `integration-status-dashboard-v1`
- Imagen construida: `jakawi-com-web:latest`
- Image ID: `sha256:3149d033497244b979780a721de75d0a341a925651af2c4acec66f7d833f3c99`
- Servicio actualizado: `jakawi_com_web`

Archivos principales:

- `evidence/preflight.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint.txt`
- `evidence/prisma-migrate-status.txt`
- `evidence/prisma-migrate-status-container.txt`
- `evidence/docker-build.txt`
- `evidence/docker-deploy.txt`
- `evidence/docker-deploy-investigation.txt`
- `evidence/docker-deploy-status.txt`
- `evidence/post-deploy-smoke.txt`
- `evidence/docker-stack-env-restore.txt`
- `evidence/post-deploy-smoke-retry-after-env-restore.txt`
- `evidence/runtime-flags-service-update.txt`
- `evidence/final-smoke-and-flags.txt`

## Cambios Incluidos

- Integration Status Dashboard v1.
- Sin migraciones Prisma nuevas en este release.
- Sin APIs externas ejecutadas para QA.

## Preflight

- Working tree inicial: limpio.
- `git rev-parse HEAD`: `f812714c2ff12ab2bab49fb415fa7341a62f4eed`.
- `git tag --points-at HEAD`: `integration-status-dashboard-v1`.

## Validaciones

- `npm run test --if-present`: PASS, 94 tests passed.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS con 23 warnings existentes de `<img>`/`next/image`.
- `npx prisma migrate status` en host: WARN, fallo por `DATABASE_URL` ausente en entorno host.
- `npx prisma migrate status` en contenedor runtime: PASS, database schema is up to date.
- Migraciones pendientes: no.
- `prisma migrate deploy`: no ejecutado.

## Deploy

- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: ejecutado.
- `docker service update --force jakawi_com_web`: el primer intento quedo pausado por una task cancelada, aunque una task nueva llego a correr con la imagen nueva.
- Incidencia: el stack quedo con variables vacias por no cargar `.env.stack`, causando `DATABASE_URL` vacio y reinicios.
- Recuperacion: se ejecuto `docker stack deploy` con `.env.stack` cargado en el shell.
- Estado final: `jakawi_com_web` `1/1`, `UpdateStatus=completed`.

## Smoke Results Finales

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

## Riesgos / Notas

- La recuperacion requirio cargar `.env.stack` explicitamente para el deploy. Ejecutar `docker stack deploy` sin ese entorno puede volver a sustituir variables como vacias.
- Las flags no secretas finales se fijaron explicitamente en el servicio web para dejar el runtime en estado seguro.

## Siguiente Hito

Owner UX Polish v1.
