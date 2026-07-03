# Cloudflare Custom Hostnames v1

## Objetivo

Cloudflare Custom Hostnames v1 integra provisioning manual de dominios custom para tiendas JAKAWI desde la consola superadmin `/app/admin/domains`.

Este hito usa `StoreDomain.cloudflareHostnameId`, `StoreDomain.sslStatus` y `StoreDomain.lastCheckedAt`; no requiere migración Prisma.

## Env Vars

`app/.env.example` incluye:

```env
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN=custom-hostname.jakawi.com
```

Default seguro:

```env
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
```

El token se lee solo en servidor. No se muestra en UI, docs ni logs.

## Permisos Minimos del API Token

Para crear y consultar Custom Hostnames en la zona SaaS:

- `SSL and Certificates:Edit` o permiso equivalente de escritura sobre certificados SSL.
- Scope limitado a la zona configurada en `CLOUDFLARE_ZONE_ID`.

Si solo se va a consultar estado, puede usarse un token read-only separado en un hito futuro. En este hito se asume un token operativo controlado por superadmin.

## Flujo Superadmin

1. Crear el dominio manual en `/app/admin/domains`.
2. Confirmar que es `CUSTOM_DOMAIN`.
3. Con `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=true` y token/zone configurados, usar `Provisionar Cloudflare`.
4. La acción llama `POST /zones/{zone_id}/custom_hostnames`.
5. JAKAWI guarda:
   - `cloudflareHostnameId`
   - `sslStatus`
   - `status` mapeado a `VERIFYING`, `ACTIVE`, `FAILED` o `DISABLED`
   - `lastCheckedAt`
6. Usar `Refrescar Cloudflare` para llamar `GET /zones/{zone_id}/custom_hostnames/{id}` y actualizar estado.

Las acciones siguen protegidas por `requireSuperAdmin()`.

## DNS que Debe Configurar el Cliente

El cliente debe apuntar su dominio a:

```text
CNAME hostname -> CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN
```

Valor default documentado:

```text
CNAME tienda.com -> custom-hostname.jakawi.com
```

Cloudflare Custom Hostnames usa validación HTTP (`ssl.method=http`) en este hito. Si Cloudflare devuelve registros de validación, JAKAWI conserva el valor disponible en `verificationValue`.

## Estados

Mapeo inicial:

- Cloudflare `active` o `staging_active` -> `StoreDomain.status=ACTIVE`.
- Cloudflare `pending_*`, `initializing`, `staging_deployment` -> `VERIFYING`.
- Cloudflare `*_timed_out` o `expired` -> `FAILED`.
- Cloudflare `inactive`, `deleted`, `deactivating` o `pending_deletion` -> `DISABLED`.

`sslStatus` conserva el valor Cloudflare original para auditoría operativa.

## Que NO se Hizo

- No self-service owner.
- No Pixel.
- No CAPI.
- No tracking.
- No CRM.
- No deploy.
- No push.
- No pagos.
- No emails reales.
- No secretos en docs/logs.

## Probar con API Disabled

Con default seguro:

```env
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
```

La UI muestra Cloudflare deshabilitado. Los botones de provisioning/refresh quedan deshabilitados y las acciones devuelven error controlado `disabled` si se invocan.

## Probar con API Enabled en Ventana Controlada

1. Configurar env solo en servidor/staging controlado:

```env
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=true
CLOUDFLARE_API_TOKEN=<token-servidor>
CLOUDFLARE_ZONE_ID=<zone-id>
CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN=custom-hostname.jakawi.com
```

2. Crear un `StoreDomain` `CUSTOM_DOMAIN`.
3. Provisionar desde `/app/admin/domains`.
4. Pedir al cliente configurar el CNAME.
5. Refrescar estado hasta `sslStatus=active`.
6. Solo habilitar runtime de dominios con `CUSTOM_DOMAINS_ENABLED=true` cuando DNS y SSL estén listos.

No registrar token en evidencia, capturas, logs ni docs.

## Rollback

- Cambiar `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false`.
- Marcar el `StoreDomain` como `DISABLED` desde la UI si no debe resolver.
- Si hace falta retirar el hostname en Cloudflare, usar operación manual en Cloudflare o una acción futura basada en `deleteCloudflareCustomHostname`.
- Mantener `CUSTOM_DOMAINS_ENABLED=false` si el objetivo es bloquear resolución runtime.

## Siguiente Hito

First-party Tracking Foundation v1:

- definir separación de tracking JAKAWI plataforma vs tienda.
- no mezclar audiencias.
- preparar eventos first-party por hostname.
- mantener Pixel/CAPI fuera hasta que exista base de consentimiento y ownership clara.
