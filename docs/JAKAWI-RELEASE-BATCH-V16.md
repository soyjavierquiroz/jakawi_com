# JAKAWI Release Batch v16

Estado: BLOCKED

Release Batch v16 no se desplegó porque el contrato de esta corrida exige `migrate deploy no ejecutado`, pero la imagen/servicio actual arranca con `pnpm prisma migrate deploy && pnpm start`.

No se hizo deploy, no se recreó el servicio, no se modificaron flags, no se hicieron DB writes manuales y no se ejecutó `prisma migrate deploy`.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v16/20260709-215804`
- Commit objetivo: `3273831a6869495ad2fbb6f410618efd2bb879b2`
- Tag en HEAD objetivo: `custom-domain-runtime-safety-fix-v1`
- Image id: n/a, no se construyó imagen por bloqueo previo a deploy
- Deploy realizado: no
- `env-add` manual needed: no

## Cambio incluido pendiente de desplegar

- `Custom Domain Runtime Safety Fix v1`

Contrato final del resolver incluido en el commit objetivo:

- `CUSTOM_DOMAINS_ENABLED=false` => `resolveStoreFromHost()` retorna `null` temprano y no consulta DB.
- `CUSTOM_DOMAINS_ENABLED=true` => sólo resuelve:
  - `type=CUSTOM_DOMAIN`
  - `status=ACTIVE`
  - hostname exact match normalizado
  - tienda publicada
- No resuelve `JAKAWI_SUBDOMAIN`.
- No resuelve `PENDING`, `VERIFYING`, `VERIFIED`, `FAILED` ni `DISABLED`.
- No resuelve `jakawi.com`, dominios reservados, `localhost` ni IPs.

## Motivo del bloqueo

Auditoría pre-deploy:

```text
app/Dockerfile: CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
```

La recreación del task `jakawi_com_web` ejecutaría `prisma migrate deploy` automáticamente al arrancar, aunque no haya migraciones pendientes. Como la regla de v16 pide explícitamente:

- No migraciones Prisma.
- `migrate deploy no ejecutado`.

Se bloqueó antes de build/deploy para no violar el contrato.

## Validaciones read-only

- `scripts/deploy-preflight.sh`: PASS
- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 135/135
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Prisma runtime

`prisma migrate status` fue ejecutado en modo read-only desde el runtime activo.

Resultado:

- 24 migraciones encontradas.
- `Database schema is up to date!`
- `migrate deploy` ejecutado: no

## Deploy

- `.env.stack` cargado para deploy: no, porque no hubo deploy
- `docker build`: no
- `docker stack deploy`: no
- `docker service update --force`: no
- Image id activo verificado contra build: n/a
- Service image id coincide: n/a

## Smoke público

No ejecutado post-deploy porque no hubo deploy.

## Runtime safety post-deploy

No ejecutado post-deploy porque no hubo deploy.

Estado runtime observado antes de cualquier deploy:

- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `META_CAPI_ENABLED=false`

## Flags finales

- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`

## Controles

- Cloudflare API llamada: no
- DNS automático: no
- Tráfico custom activado: no
- DB writes manuales: no
- Migraciones Prisma aplicadas: no
- Pagos: no
- Checkout: no
- Emails reales: no
- SMTP real: no
- CRM: no
- Meta/TikTok/Google: no
- CAPI QA: no
- Token values exposed: no
- No push: sí

## Siguiente hito recomendado

Abrir un release/fix operativo para alinear el entrypoint de producción con releases sin migración automática, o relajar explícitamente el contrato para permitir que el startup ejecute `prisma migrate deploy` cuando `migrate status` ya está up to date.

Después, reintentar:

- `JAKAWI Release Batch v16`
- luego `Custom Domain Controlled Activation v1 Retry - www.exitosos.com`
