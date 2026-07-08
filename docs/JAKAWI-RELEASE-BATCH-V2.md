# JAKAWI Release Batch v2

## Fecha

2026-07-08T02:19:27+00:00

## Commit Desplegado

`9976261659718fe808e1445b708fa64375ba579b`

Branch local:

```text
main
```

QA evidence:

```text
/var/backups/jakawi.com/qa/jakawi-release-batch-v2/20260708-021927
```

## Cambios Incluidos

- Consent Banner v1.
- TikTok Pixel Settings v1.

No se activaron integraciones externas.

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

`npx prisma migrate status` se ejecuto desde un contenedor conectado a la red interna `jakawi_com_jakawi_internal`, con el schema local montado y sin imprimir secrets.

Resultado:

```text
23 migrations found in prisma/migrations
Database schema is up to date!
```

No se ejecuto migracion manual. El CMD existente de la imagen corre `prisma migrate deploy` al iniciar y reporto `No pending migrations to apply`.

## Build y Deploy

Imagen construida:

```text
jakawi-com-web:latest
```

Image ID:

```text
sha256:729f695e00f76c8d825df18d4f69226da558d6d5439cc04e2a24e2533047fdb1
```

Servicio actualizado:

```text
jakawi_com_web
```

Se uso `docker service update --force jakawi_com_web` para recrear el servicio con la imagen local y preservar los env vars runtime existentes. No se toco Traefik manualmente y no se toco Cloudflare.

Estado final observado:

```text
jakawi_com_web 1/1 Running
```

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
https://jakawi.com/api/health code=200 body={"ok":true,"service":"jakawi.com","timestamp":"2026-07-08T02:26:58.582Z","database":"ok"}
https://jakawi.com/login code=200 location=none
https://jakawi.com/registro code=200 location=none
https://jakawi.com/app code=307 location=/login
https://jakawi.com/qa-onboarding-store code=200 location=none
https://jakawi.com/qa-onboarding-store/p/qa-producto-demo code=200 location=none
https://jakawi.com/app/integraciones code=307 location=/login
```

Consent smoke:

```text
direct_banner_reference=present
chunk_banner_reference=/_next/static/chunks/0mi42zexusva3.js
consent_smoke=pass
```

## Riesgos

- `infra/docker-stack.yml` no lista todos los env vars runtime que el servicio tiene actualmente (`APP_ENCRYPTION_KEY`, flags de custom domains, Cloudflare, Meta CAPI y email). Por eso este release no uso `docker stack deploy`; se recreo solo `jakawi_com_web` para preservar la spec vigente.
- Lint mantiene warnings existentes de `@next/next/no-img-element`; no bloquearon este release.
- Logs recientes aun contienen errores antiguos de Server Action mismatch de un task previo. El task actual arranco y quedo `Ready`.

## Que No Se Hizo

- No push.
- No CRM.
- No Meta QA.
- No CAPI QA.
- No TikTok API.
- No Google.
- No Cloudflare.
- No pagos.
- No emails reales.
- No secrets en output.

## Siguiente Hito Recomendado

Meta CAPI Controlled QA v1 cuando haya credenciales Meta controladas, o TikTok Pixel Browser v1.
