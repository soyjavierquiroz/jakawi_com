# JAKAWI Release Batch v16 Retry

Estado: PASS

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v16-retry/20260709-225628`
- Commit desplegado: `aacbdf523b19d3e067e1ea174eab8f76044a15f3`
- Image id construido: `sha256:b81b3ae704ce4fe50d667572a5431f621e6ef4bf9918f416f1863f78552e675c`
- Image id activo: `sha256:b81b3ae704ce4fe50d667572a5431f621e6ef4bf9918f416f1863f78552e675c`
- Image id activo verificado: yes
- `env-add` manual needed: no

## Cambios incluidos

- Custom Domain Runtime Safety Fix v1: `3273831a6869495ad2fbb6f410618efd2bb879b2`
- Deploy Migration Separation v1: `aacbdf523b19d3e067e1ea174eab8f76044a15f3`

## Dockerfile / image CMD

- Dockerfile startup final: `CMD ["pnpm", "start"]`
- Image CMD final: `["pnpm","start"] ["docker-entrypoint.sh"]`
- `migrate deploy` removed from startup: yes
- Image CMD contains `prisma migrate deploy`: no
- `migrate deploy` ejecutado: no

## Validaciones

- `scripts/deploy-preflight.sh`: PASS
- `MIGRATION_STARTUP_SEPARATED`: pass
- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 135/135
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Prisma runtime

`prisma migrate status` fue ejecutado en modo read-only desde runtime.

- 24 migraciones encontradas
- Database schema is up to date
- No migraciones pendientes
- `migrate deploy` ejecutado: no
- `scripts/run-prisma-migrate-deploy.sh` ejecutado: no

## Deploy

- `.env.stack` cargado antes de `docker stack deploy`: yes
- `docker build -t jakawi-com-web:latest ./app`: PASS
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: PASS
- `docker service update --force jakawi_com_web`: ejecutado porque el task no se recreó con el image id nuevo
- `jakawi_com_web`: 1/1
- `UpdateStatus`: completed
- Image id activo coincide con build: yes

## Smoke público

- `https://jakawi.com` => 200
- `https://jakawi.com/api/health` => 200, database ok
- `https://jakawi.com/login` => 200
- `https://jakawi.com/registro` => 200
- `https://jakawi.com/forgot-password` => 200
- `https://jakawi.com/app` => 307 `/login`
- `https://jakawi.com/app/dominios` => 307 `/login`
- `https://jakawi.com/app/admin/domains` => 307 `/login`
- `https://jakawi.com/qa-onboarding-store` => 200
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` => 200
- `https://jakawi.com/javier` => 200

## Runtime safety post-deploy

Con `CUSTOM_DOMAINS_ENABLED=false`:

- Host `qa-custom-domain-disabled.example` => 404, no storefront custom
- Host `www.exitosos.com` => 404, no storefront custom activo
- Host `www.exitosos.com` no mostró tienda `javier`

No se activó `www.exitosos.com`.

## Flags finales

- `CUSTOM_DOMAINS_ENABLED=false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`
- `EMAIL_DELIVERY_MODE=disabled`
- `CRM_WEBHOOK_ENABLED=false`
- `CRM_WEBHOOK_QA_ONLY=true`
- `META_CAPI_ENABLED=false`

## Controles

- Cloudflare API llamada: no
- DNS automático: no
- Tráfico custom activado: no
- DB writes manuales: no
- Prisma migrate deploy ejecutado: no
- Pagos: no
- Checkout: no
- Emails reales: no
- CRM: no
- Token values exposed: no
- No push: yes

## Siguiente hito recomendado

- Self-Service Cloudflare Custom Hostnames v1
