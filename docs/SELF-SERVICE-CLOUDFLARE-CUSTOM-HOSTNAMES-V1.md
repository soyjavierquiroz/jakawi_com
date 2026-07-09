# Self-Service Cloudflare Custom Hostnames v1

Estado: PASS

## Objetivo

Implementar el flujo self-service para dominios personalizados usando Cloudflare Custom Hostnames, sin activar tráfico custom todavía.

El owner puede:

1. escribir su dominio en `/app/dominios`;
2. ver instrucciones DNS;
3. configurar registros en su proveedor DNS;
4. pulsar “Verificar ahora”;
5. quedar activo automáticamente sólo cuando Cloudflare confirme hostname activo y SSL/certificado activo.

## Contexto runtime

Flags default esperados:

```text
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
```

Con `CUSTOM_DOMAINS_ENABLED=false`, el resolver retorna temprano y no consulta DB.

Con `CUSTOM_DOMAINS_ENABLED=true`, el resolver sólo resuelve:

- `type=CUSTOM_DOMAIN`
- `status=ACTIVE`
- hostname exact match normalizado
- tienda publicada

No resuelve `JAKAWI_SUBDOMAIN`, estados no activos, dominios reservados, localhost ni IPs.

## Flujo owner self-service

Ruta:

- `/app/dominios`

Owner puede:

- solicitar un dominio válido de su propia tienda;
- ver CNAME esperado;
- ver TXT si Cloudflare entrega DCV/TXT;
- ver estado del dominio;
- ver estado SSL/certificado;
- ver último check;
- pulsar “Verificar ahora”.

Owner no puede:

- marcar `ACTIVE` manualmente;
- marcar `primary` manualmente;
- verificar dominios de otra tienda;
- ver `CLOUDFLARE_API_TOKEN`;
- ver headers auth;
- ver respuesta raw de Cloudflare;
- ver IDs privados completos.

Mensaje principal:

```text
Tu dominio se activará automáticamente cuando DNS y SSL estén listos.
```

## Flujo Cloudflare

Cliente:

- `app/src/lib/cloudflare-custom-hostnames.ts`

Funciones:

- `createCloudflareCustomHostname(hostname)`
- `getCloudflareCustomHostname(cloudflareHostnameId)`
- `refreshCloudflareCustomHostname(cloudflareHostnameId)`
- `mapCloudflareCustomHostnameToDomainStatus()`
- `extractCloudflareDnsInstructions()`
- `redactCloudflareError()`

Requisitos implementados:

- fetch con timeout;
- sin imprimir token;
- sin devolver headers auth en errores;
- errores owner-safe;
- tests con fetch mock;
- si `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`, no llama Cloudflare.

## Variables env

Placeholders agregados:

```text
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
CUSTOM_DOMAIN_CNAME_TARGET=
CLOUDFLARE_CUSTOM_HOSTNAME_SSL_METHOD=http
CLOUDFLARE_CUSTOM_HOSTNAME_MIN_TLS_VERSION=1.2
CLOUDFLARE_API_TIMEOUT_MS=8000
```

No se agregaron valores reales.

`infra/docker-stack.yml` expone estos nombres al servicio web para releases futuros, sin valores secretos en repo.

## DNS instructions

Instrucciones visibles:

- `CNAME hostname -> CUSTOM_DOMAIN_CNAME_TARGET` o fallback configurado;
- `TXT` si Cloudflare entrega verification value;
- nunca token API;
- nunca headers auth;
- nunca respuesta raw.

## Cuándo se llama Cloudflare

Se llama Cloudflare sólo si:

- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=true`;
- existen `CLOUDFLARE_ZONE_ID` y `CLOUDFLARE_API_TOKEN`;
- la acción es explícita:
  - solicitud owner con flag on;
  - “Verificar ahora” owner;
  - “Verificar Cloudflare” superadmin.

## Cuándo NO se llama Cloudflare

No se llama Cloudflare si:

- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`;
- falta configuración;
- tests/local usan mocks;
- el owner intenta verificar dominio de otra tienda;
- el dominio no es `CUSTOM_DOMAIN`;
- el flujo es sólo render/UI.

## Status mapping

StoreDomain se mantiene seguro:

- hostname active + SSL active + hostname exact match + tienda publicada => `ACTIVE`
- hostname active + SSL pending => `VERIFYING`
- hostname pending + SSL active => `VERIFYING`
- failed/timed out/expired => `FAILED`
- deleted/inactive/deactivating => `DISABLED`

`ACTIVE` nunca se asigna sólo porque el owner presione un botón.

## Primary

Cuando un dominio pasa a `ACTIVE` por Cloudflare:

- si no hay otro `CUSTOM_DOMAIN ACTIVE` primary en la tienda, puede quedar `isPrimary=true`;
- si ya hay otro primary activo, no se cambia sin decisión explícita.

## Qué ve superadmin

Ruta:

- `/app/admin/domains`

Superadmin ve:

- hostname;
- tienda;
- owner redactado;
- StoreDomain status;
- Cloudflare hostname id parcial/redactado;
- SSL/cert status;
- último check;
- CNAME/TXT esperado;
- botón “Verificar Cloudflare”;
- overrides manuales existentes.

Superadmin no ve:

- `CLOUDFLARE_API_TOKEN`;
- headers auth;
- respuesta raw;
- cookies;
- owner email completo.

## Persistencia y migración

Migración Prisma: no.

Se reusó `StoreDomain` existente:

- `cloudflareHostnameId`
- `verificationType`
- `verificationValue`
- `status`
- `sslStatus`
- `lastCheckedAt`

No se guardan tokens ni secrets.

No hay campo persistente para último error Cloudflare; los errores se devuelven como mensajes owner-safe/admin-safe en la acción.

## Qué NO hace

- No activa tráfico custom todavía.
- No cambia `CUSTOM_DOMAINS_ENABLED`.
- No cambia `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`.
- No llama Cloudflare en tests/local sin flag.
- No pagos.
- No checkout.
- No emails.
- No CRM.
- No Meta/TikTok/Google.
- No CAPI QA.
- No deploy.
- No push.

## Validaciones

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS
- Typecheck: PASS
- Lint: PASS, 0 warnings

## Siguiente hito recomendado

- Self-Service Cloudflare Custom Hostnames QA v1
- Release Batch v17
- `www.exitosos.com` activation via self-service flow
