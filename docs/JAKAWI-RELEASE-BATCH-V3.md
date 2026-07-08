# JAKAWI Release Batch v3

## Fecha

2026-07-08T02:56:27+00:00

## Commit Desplegado

`18113c189115747f4ff7fdc0393a0db1d24ebeb0`

Branch local:

```text
main
```

QA evidence:

```text
/var/backups/jakawi.com/qa/jakawi-release-batch-v3/20260708-024642
```

## Cambios Incluidos

- TikTok Pixel Browser v1.

No se activaron integraciones externas nuevas.

## Validaciones

Desde `/var/opt/jakawi.com/app`:

```text
npx prisma validate: PASS con DATABASE_URL placeholder para validar schema.
npx prisma generate: PASS.
npm run test --if-present: PASS.
npm run typecheck --if-present: PASS.
npm run lint --if-present: PASS con warnings existentes de no-img-element.
```

Nota: `npx prisma validate` sin `DATABASE_URL` local fallo por env faltante. Se repitio con URL placeholder no productiva y el schema valido correctamente.

## Migraciones Pendientes

None.

`npx prisma migrate status` se ejecuto desde el contenedor `jakawi_com_web`, usando su entorno runtime real y sin imprimir secrets.

Resultado:

```text
23 migrations found in prisma/migrations
Database schema is up to date!
```

No se ejecuto migracion manual.

## Build y Deploy

Imagen construida:

```text
jakawi-com-web:latest
```

Image ID:

```text
sha256:5e46b230283df1f34f381a6dbc50dcd614e0b2187e546d89ce4f9658e9b5f874
```

Servicio actualizado:

```text
jakawi_com_web
```

Se uso `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com` con `.env.stack` cargado, seguido de `docker service update --force jakawi_com_web`.

Tambien se agregaron al servicio los flags runtime no secretos requeridos que no estan listados actualmente en `infra/docker-stack.yml`.

Estado final observado:

```text
jakawi_com_web 1/1 Running
```

No se toco Traefik manualmente. No se toco Cloudflare.

## Flags Finales

Runtime env redacted:

```text
CRM_WEBHOOK_ENABLED=false
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
EMAIL_DELIVERY_MODE=disabled
APP_ENCRYPTION_KEY_present=yes
```

## Smoke Results

```text
https://jakawi.com code=200 location=none
https://jakawi.com/api/health code=200 body={"ok":true,"service":"jakawi.com","timestamp":"2026-07-08T02:55:38.083Z","database":"ok"}
https://jakawi.com/login code=200 location=none
https://jakawi.com/registro code=200 location=none
https://jakawi.com/app code=307 location=/login
https://jakawi.com/qa-onboarding-store code=200 location=none
https://jakawi.com/qa-onboarding-store/p/qa-producto-demo code=200 location=none
https://jakawi.com/app/integraciones code=307 location=/login
```

## TikTok Smoke Negativo Por Defecto

Sin una integracion TikTok activa configurada en la tienda QA, el HTML de `https://jakawi.com/qa-onboarding-store` no cargo TikTok Pixel por defecto.

```text
analytics.tiktok.com=ABSENT
ttq.load=ABSENT
TikTok pixelId=ABSENT
```

TikTok default loaded: no.

## Riesgos

- El primer `docker stack deploy` se ejecuto sin cargar `.env.stack`; el servicio quedo con variables vacias, produjo reinicios por `DATABASE_URL` vacio y fue corregido antes del smoke final mediante redeploy con `.env.stack` cargado.
- `infra/docker-stack.yml` no lista todos los flags runtime requeridos para este release (`CUSTOM_DOMAINS_ENABLED`, `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`, `META_CAPI_ENABLED`, `EMAIL_DELIVERY_MODE`). Se agregaron al servicio con `docker service update --env-add` para cumplir el estado runtime final.
- Lint mantiene warnings existentes de `@next/next/no-img-element`; no bloquearon este release.

## Que No Se Hizo

- No push.
- No CRM.
- No Meta CAPI QA.
- No TikTok Events API.
- No Google.
- No Cloudflare.
- No pagos.
- No emails reales.
- No secrets en output.

## Siguiente Hito Recomendado

Meta CAPI Controlled QA v1 cuando haya credenciales Meta controladas, o TikTok Events API v1 cuando haya credenciales TikTok.
