# Multi-domain Foundation v1

## Objetivo

Multi-domain Foundation v1 prepara a JAKAWI para resolver tiendas por dominio propio o subdominio controlado, manteniendo intacto el comportamiento actual de `jakawi.com/{storeSlug}`.

Regla madre: JAKAWI plataforma mide JAKAWI. Cada tienda mide su propio espacio comercial. No se mezclan audiencias ni tracking entre JAKAWI y tiendas.

## Separacion de medicion

- `jakawi.com` y `www.jakawi.com` siguen siendo plataforma JAKAWI.
- `jakawi.com/{storeSlug}` sigue siendo storefront por slug de plataforma.
- Un dominio de tienda solo resuelve una tienda cuando existe un `StoreDomain` activo y `CUSTOM_DOMAINS_ENABLED=true`.
- Este hito no agrega Pixel, CAPI, CRM ni eventos compartidos entre dominios.

## Modelo Prisma

Se agrego `StoreDomain` con relacion `Store.domains`.

Campos principales:

- `hostname`: unico, normalizado lowercase sin protocolo, puerto, path, query ni trailing dot.
- `type`: `JAKAWI_SLUG`, `JAKAWI_SUBDOMAIN`, `CUSTOM_DOMAIN`.
- `status`: `PENDING`, `VERIFYING`, `ACTIVE`, `FAILED`, `DISABLED`.
- `isPrimary`: marca dominio primario por tienda para uso operativo futuro.
- `verificationType`: `NONE`, `DNS_TXT`, `DNS_CNAME`, `MANUAL`.
- `verificationValue`, `cloudflareHostnameId`, `sslStatus`, `lastCheckedAt`: preparacion para verificacion y provisioning futuros.

Indices:

- `hostname` unico.
- `storeId`.
- `storeId/isPrimary`.
- `status`.

Migracion local: `app/prisma/migrations/000021_add_store_domains/migration.sql`.

## Env Vars

`app/.env.example` incluye:

```env
CUSTOM_DOMAINS_ENABLED=false
JAKAWI_PRIMARY_DOMAIN=jakawi.com
```

Default seguro: `CUSTOM_DOMAINS_ENABLED=false`.

## Routing Soportado

- `jakawi.com/{storeSlug}` renderiza la tienda por slug como antes.
- `jakawi.com/{storeSlug}/p/{productSlug}` renderiza el producto como antes.
- `customdomain.com/` renderiza la tienda asociada al `StoreDomain.hostname` activo.
- `customdomain.com/p/{productSlug}` renderiza producto de esa tienda.
- Subdominios como `tienda.jakawi.com` quedan preparados como `JAKAWI_SUBDOMAIN`, no como `CUSTOM_DOMAIN`.

No se agrego DB lookup en middleware Edge. La resolucion vive en helpers server-side y paginas App Router.

## Validacion de Hostnames

El helper `app/src/lib/domains.ts`:

- normaliza lowercase.
- remueve `http://`, `https://`, path, query, hash, puerto y trailing dot.
- rechaza `localhost`.
- rechaza IPs privadas y publicas.
- rechaza `jakawi.com` y `www.jakawi.com` como dominio de tienda.
- rechaza `crm.jakawi.com`, `media.jakawi.com`, `minio.jakawi.com`.
- rechaza subdominios `*.jakawi.com` como `CUSTOM_DOMAIN`; deben ser `JAKAWI_SUBDOMAIN`.

## Prueba Local o Staging con Host Header

Con `CUSTOM_DOMAINS_ENABLED=true` y un `StoreDomain` activo creado manualmente:

```bash
curl -H "Host: customdomain.com" http://127.0.0.1:3000/
curl -H "Host: customdomain.com" http://127.0.0.1:3000/p/demo
curl -H "Host: jakawi.com" http://127.0.0.1:3000/demo
```

El dominio debe existir en DB con `status=ACTIVE`, `type=CUSTOM_DOMAIN` o `type=JAKAWI_SUBDOMAIN`, y apuntar a una tienda publicada.

## Que NO se hizo

- No Cloudflare API.
- No Cloudflare provisioning.
- No Pixel.
- No CAPI.
- No CRM.
- No self-service owner.
- No pagos.
- No emails reales.
- No deploy.
- No push.
- No secrets.

## Riesgos

- Los links internos de algunas plantillas siguen generando rutas `/{storeSlug}/p/{productSlug}`. En dominios custom esas rutas resuelven por Host en v1, pero el siguiente hito deberia generar URLs canonicas `/p/{productSlug}` cuando el request venga por dominio directo.
- `isPrimary` no tiene restriccion unica en DB; la accion manual desmarca otros primarios para la tienda, pero una escritura directa podria crear inconsistencias.
- La resolucion de dominio depende de registros `ACTIVE`; estados `PENDING` o `VERIFYING` no publican storefront.

## Siguiente Hito

Domain Verification UI v1:

- pantalla superadmin para listar y crear dominios por tienda.
- verificacion manual guiada.
- estado visible de DNS/SSL.
- URLs canonicas por dominio directo.
- preparacion para integrar Cloudflare despues, sin mezclar tracking de plataforma y tienda.
