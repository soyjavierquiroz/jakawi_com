# Docker Stack Env Alignment v1

## Resultado

PASS.

Se actualizo `infra/docker-stack.yml` para que el servicio `jakawi_com_web` liste explicitamente variables runtime criticas que antes quedaban corregidas manualmente con `docker service update --env-add`.

## Objetivo

Evitar que un futuro `docker stack deploy` remueva variables runtime criticas de la spec del servicio web por no estar versionadas en el stack file.

## Variables Agregadas

- `APP_ENCRYPTION_KEY: ${APP_ENCRYPTION_KEY}`
- `CUSTOM_DOMAINS_ENABLED: ${CUSTOM_DOMAINS_ENABLED}`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED: ${CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED}`
- `META_CAPI_ENABLED: ${META_CAPI_ENABLED}`
- `EMAIL_DELIVERY_MODE: ${EMAIL_DELIVERY_MODE}`

Ya estaban presentes y se verificaron:

- `DATABASE_URL: ${DATABASE_URL}`
- `SESSION_SECRET: ${SESSION_SECRET}`
- `CRM_WEBHOOK_ENABLED: ${CRM_WEBHOOK_ENABLED}`
- `CRM_WEBHOOK_QA_ONLY: ${CRM_WEBHOOK_QA_ONLY}`

## Por Que Se Hizo

Release Batch v7 quedo PASS, pero detecto que `infra/docker-stack.yml` no listaba algunas variables runtime finales. El servicio quedo correcto despues de una correccion manual con `docker service update --env-add`, pero el stack file seguia desalineado con la spec runtime esperada.

Este cambio versiona las referencias necesarias para que el stack file sea la fuente de verdad del runtime esperado.

## Controles

- No deploy.
- No push.
- No runtime changes.
- No secrets.
- No se imprimio `.env.stack`.
- No app code.
- No Prisma.
- No migraciones.
- No pagos.
- No emails reales.

## Validaciones

- Working tree inicial limpio.
- `scripts/deploy-preflight.sh` ejecutado con salida redacted.
- `infra/docker-stack.yml` contiene las variables requeridas.
- `docs/DEPLOY-SAFETY-RUNBOOK-V1.md` actualizado para indicar que las variables runtime criticas deben estar versionadas en el stack file.
- `git diff --check`: PASS.

## Siguiente Hito

- Release Batch v8.
