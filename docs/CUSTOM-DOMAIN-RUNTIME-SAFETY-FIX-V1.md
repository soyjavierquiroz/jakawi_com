# Custom Domain Runtime Safety Fix v1

Estado: PASS

## Objetivo

Corregir el resolver runtime de dominios personalizados para que, cuando `CUSTOM_DOMAINS_ENABLED=true`, sólo resuelva dominios `StoreDomain` de tipo `CUSTOM_DOMAIN` con `status=ACTIVE` y hostname exact match normalizado.

## Motivo del fix

`Custom Domain Controlled Activation v1 Retry - www.exitosos.com` quedó `BLOCKED` correctamente porque `resolveStoreFromHost()` permitía:

```ts
type: { in: ["CUSTOM_DOMAIN", "JAKAWI_SUBDOMAIN"] }
```

El contrato de activación controlada exige resolver únicamente:

- `type=CUSTOM_DOMAIN`
- `status=ACTIVE`
- hostname exact match normalizado

## Cambio aplicado

Se cambió el query runtime de `resolveStoreFromHost()` para consultar sólo:

```ts
where: {
  hostname,
  status: "ACTIVE",
  type: "CUSTOM_DOMAIN",
}
```

También se ajustó la salida de `resolveStorefrontRequest()` para que cualquier resolución custom válida retorne modo `CUSTOM_DOMAIN`.

## Contrato final del resolver

Con `CUSTOM_DOMAINS_ENABLED=false`:

- retorna `null` temprano;
- no consulta DB.

Con `CUSTOM_DOMAINS_ENABLED=true`, sólo resuelve si:

- el hostname normalizado existe;
- no es host plataforma/reservado/local/IP;
- `hostname` coincide exactamente con el hostname normalizado;
- `status=ACTIVE`;
- `type=CUSTOM_DOMAIN`;
- la tienda asociada está publicada.

No resuelve:

- `PENDING`
- `VERIFYING`
- `VERIFIED`
- `FAILED`
- `DISABLED`
- `JAKAWI_SUBDOMAIN`
- dominios reservados de JAKAWI
- `localhost`
- IPs

## JAKAWI_SUBDOMAIN

`JAKAWI_SUBDOMAIN` no se resuelve con `CUSTOM_DOMAINS_ENABLED`.

Quedan referencias de tipo/validación y tests heredados para no romper compatibilidad de modelo o validaciones existentes, pero `resolveStoreFromHost()` ya no consulta `JAKAWI_SUBDOMAIN` y los tests confirman que `JAKAWI_SUBDOMAIN ACTIVE` no resuelve storefront custom.

## Storefront normal

El fix no cambia la resolución normal de plataforma:

- `https://jakawi.com/{storeSlug}`
- `https://jakawi.com/{storeSlug}/p/{productSlug}`
- rutas públicas existentes
- login/app/admin

Las rutas plataforma siguen resolviendo por path/slug, no por `StoreDomain`.

## Flags y runtime

- `CUSTOM_DOMAINS_ENABLED`: no cambiado
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`: no cambiado
- Deploy realizado: no
- Cloudflare API llamada: no
- DNS automático: no

## Datos y migraciones

- DB writes: no
- Migraciones Prisma: no
- Datos reales modificados: no

## Validaciones

- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 135/135
- Typecheck: PASS
- Lint: PASS, 0 warnings

Tests agregados/ajustados cubren:

- `CUSTOM_DOMAINS_ENABLED=false` retorna temprano sin DB lookup;
- `CUSTOM_DOMAIN ACTIVE` exact match resuelve;
- `PENDING`, `VERIFYING`, `VERIFIED`, `FAILED`, `DISABLED` no resuelven;
- `JAKAWI_SUBDOMAIN ACTIVE` no resuelve;
- hostname case-insensitive normaliza;
- hostname con puerto normaliza;
- `jakawi.com` reservado no resuelve por `StoreDomain`;
- `localhost` e IPs no resuelven;
- `jakawi.com/{slug}` sigue por ruta/path normal.

## Secret scan

- Secrets exposed: no
- No `DATABASE_URL`
- No `SESSION_SECRET`
- No `APP_ENCRYPTION_KEY`
- No `CLOUDFLARE_API_TOKEN`
- No `SMTP_PASSWORD`
- No cookies completas
- No tokens largos
- No `accessTokenEncrypted`

## Siguiente hito recomendado

Reintentar:

- `Custom Domain Controlled Activation v1 Retry - www.exitosos.com`
