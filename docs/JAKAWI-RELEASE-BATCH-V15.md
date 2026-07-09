# JAKAWI Release Batch v15

Estado: WARN

Release Batch v15 desplegó Custom Domains Manual Beta v1 y registró Custom Domains Manual Beta QA v1, aplicando de forma controlada la migración `000024_extend_store_domains_manual_beta`.

El único WARN pendiente es visual/auth: no hubo sesión owner/superadmin segura disponible para validar pantallas autenticadas ni generar screenshots reales. No se fabricaron screenshots.

## Evidencia

- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v15/20260709-152107`
- Commit desplegado: `912476560ff429bc31b4049a9606f76d2012d66d`
- Image id construido: `sha256:d76b9affeeb74d13c6f8feafe013e9a71e29f032395178c2715e45366d1ce89a`
- Image id activo verificado: `sha256:d76b9affeeb74d13c6f8feafe013e9a71e29f032395178c2715e45366d1ce89a`
- `env-add` manual needed: no
- Deploy: `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`
- Task no se recreó sólo con `stack deploy`; se ejecutó `docker service update --force jakawi_com_web`.
- Servicio final: `jakawi_com_web` 1/1
- UpdateStatus final: `completed`

## Cambios incluidos

- Custom Domains Manual Beta v1: `50859aa295f44a45d5c222c4fae3fe274a8a2c3c`
- Custom Domains Manual Beta QA v1 docs: `912476560ff429bc31b4049a9606f76d2012d66d`

Rutas desplegadas:

- `/app/dominios`
- `/app/admin/domains`

## Migración

Migración aplicada: sí

- `000024_extend_store_domains_manual_beta`
- Cambio: agrega `StoreDomainStatus.VERIFIED`
- No borra datos.
- No modifica tablas no relacionadas.
- No se ejecutaron migraciones inesperadas.

Migrate status before:

- El contenedor activo previo todavía contenía 23 migraciones, por imagen anterior.
- Al evaluar desde contenedor temporal con el checkout nuevo montado sobre la red interna `jakawi_com_jakawi_internal`, había 24 migraciones y sólo una pendiente:
  - `000024_extend_store_domains_manual_beta`

Migrate deploy:

- `000024_extend_store_domains_manual_beta` aplicada correctamente.

Migrate status after:

- 24 migraciones encontradas.
- `Database schema is up to date!`

## Validaciones locales

- `scripts/deploy-preflight.sh`: PASS
- Prisma validate: PASS
  - Nota: el primer intento sin `.env.stack` cargado falló por falta de `DATABASE_URL`; se repitió cargando `.env.stack` sin imprimir valores y pasó.
- Prisma generate: PASS
- Tests: PASS, 127/127
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Deploy

- `.env.stack` cargado en el mismo shell antes de `docker stack deploy`: sí
- `docker build -t jakawi-com-web:latest ./app`: PASS
- Image id construido guardado y comparado: sí
- `docker stack deploy --resolve-image never`: PASS
- `docker service update --force jakawi_com_web`: ejecutado porque el task no se recreó con `stack deploy`
- Image id activo coincide con build: sí
- `env-add` manual needed: no
- No push: sí

## Smoke público

Resultados post-deploy:

- `https://jakawi.com` => 200
- `https://jakawi.com/api/health` => 200, database `ok`
- `https://jakawi.com/login` => 200
- `https://jakawi.com/registro` => 200
- `https://jakawi.com/forgot-password` => 200
- `https://jakawi.com/app` => 307 `/login`
- `https://jakawi.com/app/dominios` => 307 `/login`
- `https://jakawi.com/app/admin/domains` => 307 `/login`
- `https://jakawi.com/app/admin/beta` => 307 `/login`
- `https://jakawi.com/qa-onboarding-store` => 200
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo` => 200

## Custom domains post-deploy

- `/app/dominios` sin sesión: 307 `/login`
- `/app/admin/domains` sin sesión: 307 `/login`
- No renderiza datos admin públicamente: PASS por redirect sin sesión
- No expone Cloudflare IDs privados: PASS en checks sin sesión
- No expone tokens/secrets: PASS en checks sin sesión y secret scan de evidencia
- Host inventado local `qa-custom-domain-disabled.example`: 404, no storefront custom activo
- `resolveStoreFromHost()` mantiene early return cuando `CUSTOM_DOMAINS_ENABLED=false`
- Cloudflare API llamada: no
- DNS automático: no
- Tráfico custom activado: no

## Visual/auth

- Validación visual owner: no
- Validación visual superadmin: no
- Screenshots: no
- Motivo WARN: no hubo sesión owner/superadmin segura disponible; no se fabricaron screenshots ni se crearon dominios reales.

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

## Controles de alcance

- Cloudflare API llamada: no
- DNS automático: no
- Tráfico custom activado: no
- Pagos reales: no
- Checkout real: no
- Emails reales: no
- SMTP real: no
- CRM: no
- Meta/TikTok/Google: no
- CAPI QA: no
- Datos reales modificados manualmente: no
- Valores de tokens/secrets expuestos: no
- Deploy realizado: sí
- Push realizado: no

## Siguiente hito recomendado

- `Custom Domain Controlled Activation v1` con un dominio real autorizado.
- O `Custom Domains Authenticated QA Retry` si aparece una sesión owner/superadmin segura antes de activar dominios reales.
