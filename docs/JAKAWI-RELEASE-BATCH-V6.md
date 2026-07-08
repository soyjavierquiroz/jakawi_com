# JAKAWI Release Batch v6

## Resultado

PASS.

Se desplego a produccion Owner Integration Copy Sanitization v1 y Owner Authenticated QA v1 retry docs. El servicio `jakawi_com_web` quedo `1/1`, con update `completed`, y el contenedor activo quedo usando la imagen construida para este batch.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v6/20260708-101038`
- Repo: `/var/opt/jakawi.com`
- Commit desplegado: `77390f141349f94e6daa40e60631fa931bdd070c`
- Tag previo en commit desplegado: `owner-authenticated-qa-v1-retry-pass`
- Image id desplegado: `sha256:5a333582444679ea58cdc1989944917c7f70f4748d6ac8508daa9f8ad20d76ed`
- Deploy preflight: `scripts/deploy-preflight.sh` ejecutado y guardado redacted.

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-head.txt`
- `evidence/git-log-oneline-decorate-15.txt`
- `evidence/git-tags-points-at-head.txt`
- `evidence/deploy-preflight-redacted.txt`
- `evidence/critical-env-redacted.txt`
- `evidence/npm-test.txt`
- `evidence/npm-typecheck.txt`
- `evidence/npm-lint.txt`
- `evidence/prisma-migrate-status-runtime.txt`
- `evidence/docker-build.txt`
- `evidence/docker-image-id.txt`
- `evidence/docker-stack-deploy.txt`
- `evidence/docker-service-update-force.txt`
- `evidence/docker-update-status-after-force.json`
- `evidence/running-container-image-id-after-force.txt`
- `evidence/post-deploy-smoke.txt`
- `evidence/prod-auth-integraciones-summary.json`
- `evidence/prod-auth-integraciones-visible-text.txt`
- `evidence/prod-auth-session-cleanup.json`
- `evidence/final-flags-redacted.txt`

## Cambios Incluidos

- Owner Integration Copy Sanitization v1: `8a61bb40c9b0a0cc4f525054435eac1ccd270795`.
- Owner Authenticated QA v1 retry docs: `77390f141349f94e6daa40e60631fa931bdd070c`.

## Preflight y Validaciones

- Working tree inicial: limpio.
- Runbook presente: `docs/DEPLOY-SAFETY-RUNBOOK-V1.md`.
- `scripts/deploy-preflight.sh`: presente, ejecutable, `bash -n` PASS.
- `scripts/deploy-preflight.sh`: PASS redacted, sin valores secretos impresos.
- `npm run test --if-present`: PASS, 96 tests.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS con 23 warnings existentes de `<img>`/`next/image`.
- Migraciones pendientes: none. Host no resolvio `DATABASE_URL`, se valido desde runtime y Prisma reporto `Database schema is up to date!`.
- `migrate deploy`: no ejecutado porque no habia migraciones pendientes reales.

## Deploy

- `.env.stack` fue cargado antes de `docker stack deploy`.
- Variables criticas confirmadas solo redacted: present/missing o flags booleanos, sin valores.
- `docker build -t jakawi-com-web:latest ./app`: PASS.
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: ejecutado.
- Nota operativa: `docker stack deploy` no recreo el task activo porque el tag local `jakawi-com-web:latest` no cambio la especificacion del servicio. Se ejecuto `docker service update --force jakawi_com_web` y se guardo evidencia.
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

## Smoke Autenticado `/app/integraciones`

PASS.

- Sesion owner QA temporal segura: yes.
- Cookie usada: `jakawi_session`.
- Token/cookie/hash impresos: no.
- Ruta autenticada: `https://jakawi.com/app/integraciones`.
- HTTP autenticado: 200.
- Status dashboard visible: yes.
- Copy esperado visible:
  - `Cifrado del servidor activo` o `Cifrado del servidor pendiente`: yes.
  - `Token privado de eventos`: yes.
  - `Eventos del servidor`: yes.
- Strings internas visibles: no.
- Strings internas en HTML raw: no.
- Token values exposed: no.
- Sesion temporal eliminada: `temporarySessionDeleted=1`, `temporarySessionRemaining=0`.

Strings no visibles:

- `APP_ENCRYPTION_KEY`
- `DATABASE_URL`
- `SESSION_SECRET`
- `accessTokenEncrypted`
- `Access token CAPI`
- `access token`

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

## Siguiente Hito Recomendado

- Lint Warning Cleanup v1.
- Owner Catalog Management QA v1.
