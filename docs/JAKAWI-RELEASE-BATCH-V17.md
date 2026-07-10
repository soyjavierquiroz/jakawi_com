# JAKAWI Release Batch v17

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v17/20260710-022656`

Commit deployed: `63bcec4756e497c5a31fdd15be6503b1043c726f`

Image id: `sha256:2088ccc0ce8e07ee085a92a14f59595bf3dc61b2440fa7d5d33066c79e061b39`

## Changes Included

- Self-Service Cloudflare Custom Hostnames v1: `0af4187adcdae91c56cb320c6762dfda6fcf2dd3`
- Self-Service Cloudflare Custom Hostnames QA v1 docs: `63bcec4756e497c5a31fdd15be6503b1043c726f`

## Preflight

- `scripts/deploy-preflight.sh`: PASS
- `MIGRATION_STARTUP_SEPARATED`: `pass`
- `.env.stack` loaded before `docker stack deploy`: yes
- Manual `env-add` needed: no

## Validation

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 144 passed
- Typecheck: PASS
- Lint: PASS, 0 warnings

Note: the first `prisma validate` attempt without stack env failed because `DATABASE_URL` was not present in the shell. It was preserved as evidence and rerun with `.env.stack` loaded.

## Prisma Runtime

- Runtime `prisma migrate status`: PASS
- Database schema: up to date
- Pending migrations: no
- `prisma migrate deploy` executed: no

## Docker Deploy

- Dockerfile/image CMD: `["pnpm","start"]`
- Image CMD contains `pnpm start`: yes
- Image CMD contains `prisma migrate deploy`: no
- Stack deploy: PASS
- Service replicas: `1/1`
- UpdateStatus: completed
- Active service image id verified: yes
- Active image id matched build: yes
- `docker service update --force` needed: no

## Public Smoke

- `https://jakawi.com`: 200
- `https://jakawi.com/api/health`: 200, database ok
- `https://jakawi.com/login`: 200
- `https://jakawi.com/registro`: 200
- `https://jakawi.com/forgot-password`: 200
- `https://jakawi.com/app`: 307 to `/login`
- `https://jakawi.com/app/dominios`: 307 to `/login`
- `https://jakawi.com/app/admin/domains`: 307 to `/login`
- `https://jakawi.com/qa-onboarding-store`: 200
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`: 200
- `https://jakawi.com/javier`: 200

## Cloudflare Automation Safety

- `CUSTOM_DOMAINS_ENABLED` final: `false`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` final: `false`
- `EMAIL_DELIVERY_MODE` final: `disabled`
- `CRM_WEBHOOK_ENABLED` final: `false`
- `CRM_WEBHOOK_QA_ONLY` final: `true`
- `META_CAPI_ENABLED` final: `false`
- Cloudflare API called: no
- Automatic DNS: no
- Custom traffic activated: no
- `/app/dominios` protected without session: yes, 307 to `/login`
- `/app/admin/domains` protected without session: yes, 307 to `/login`
- Host `www.exitosos.com` with flags false: no custom storefront; `/` served JAKAWI home and `/p/qa-producto-demo` returned 404
- Host `qa-custom-domain-disabled.example` with flags false: no custom storefront; `/` served JAKAWI home and `/p/qa-producto-demo` returned 404

## Secrets

- Token values exposed in evidence: no
- `DATABASE_URL` value exposed: no
- `SESSION_SECRET` value exposed: no
- `APP_ENCRYPTION_KEY` value exposed: no
- `CLOUDFLARE_API_TOKEN` value exposed: not set
- `Authorization:` / `Bearer` / complete cookies / `accessTokenEncrypted`: no

## Activation Pending

- Add real Cloudflare vars if missing:
  - `CLOUDFLARE_ZONE_ID`
  - `CLOUDFLARE_API_TOKEN`
  - `CUSTOM_DOMAIN_CNAME_TARGET`
- Activate `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED` in a controlled QA pass.
- Activate `CUSTOM_DOMAINS_ENABLED` only with ACTIVE domains.

## Recommended Next Milestone

- Cloudflare Custom Hostnames Controlled QA v1
- Then `www.exitosos.com` self-service activation
