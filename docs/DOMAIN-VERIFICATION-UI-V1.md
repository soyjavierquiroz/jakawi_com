# Domain Verification UI v1

## Objetivo

Domain Verification UI v1 agrega una consola superadmin para gestionar `StoreDomain` de forma manual, sin Cloudflare API y sin self-service owner.

La ruta operativa es:

```text
/app/admin/domains
```

## Acceso

La página requiere `requireSuperAdmin()`. Owners no pueden crear, activar ni marcar dominios primary desde este hito.

## Acciones Disponibles

- Ver dominios registrados.
- Crear dominio manual para una tienda.
- Normalizar hostname antes de guardar.
- Bloquear hostnames reservados o inválidos.
- Bloquear duplicados por `hostname`.
- Cambiar estado: `PENDING`, `VERIFYING`, `ACTIVE`, `FAILED`, `DISABLED`.
- Marcar un dominio como primary.
- Desmarcar otros primary de la misma tienda en transacción.
- Ver instrucciones DNS manuales.
- Ver qué tienda resolvería un dominio activo.

## Estados

- `PENDING`: creado, pendiente de revisión.
- `VERIFYING`: en proceso manual de revisión DNS.
- `ACTIVE`: habilitado en DB para resolver cuando `CUSTOM_DOMAINS_ENABLED=true`.
- `FAILED`: revisión fallida.
- `DISABLED`: no debe resolver storefront.

Si se marca `ACTIVE`, `lastCheckedAt` se actualiza localmente. No se consulta ningún proveedor externo.

## DNS Manual

Para `CUSTOM_DOMAIN`:

```text
CNAME: hostname -> custom-hostname.jakawi.com
TXT: hostname -> jakawi-domain-verification=hostname
```

`custom-hostname.jakawi.com` es un placeholder operativo documentado para este hito. Cloudflare Custom Hostnames v1 sigue pendiente.

Para `JAKAWI_SUBDOMAIN`:

- Debe ser un subdominio de `jakawi.com`.
- Requiere control/wildcard DNS de JAKAWI.
- No se permite crearlo como `CUSTOM_DOMAIN`.

## Validaciones de Hostname

La UI usa `validateStoreDomainHostname`:

- rechaza `jakawi.com`.
- rechaza `www.jakawi.com`.
- rechaza `crm.jakawi.com`.
- rechaza `media.jakawi.com`.
- rechaza `minio.jakawi.com`.
- rechaza `localhost`.
- rechaza IPs privadas y públicas.
- rechaza `*.jakawi.com` como `CUSTOM_DOMAIN`.

## Runtime

`CUSTOM_DOMAINS_ENABLED=false` sigue siendo el default seguro.

Con `CUSTOM_DOMAINS_ENABLED=false`, la UI permite administrar registros, pero los dominios custom no resuelven storefront por Host.

Con `CUSTOM_DOMAINS_ENABLED=true`, un dominio resuelve si:

- `StoreDomain.hostname` coincide con el Host normalizado.
- `StoreDomain.status=ACTIVE`.
- `StoreDomain.type` es `CUSTOM_DOMAIN` o `JAKAWI_SUBDOMAIN`.
- la tienda asociada está publicada.

## Como Probar con Host Header

En local/staging, con `CUSTOM_DOMAINS_ENABLED=true` y un dominio `ACTIVE`:

```bash
curl -H "Host: customdomain.com" http://127.0.0.1:3000/
curl -H "Host: customdomain.com" http://127.0.0.1:3000/p/demo
curl -H "Host: tienda.jakawi.com" http://127.0.0.1:3000/
```

Con `CUSTOM_DOMAINS_ENABLED=false`, esos requests no deben resolver como storefront custom.

## Que NO Hace

- No Cloudflare API.
- No provisioning SSL automático.
- No Cloudflare Custom Hostnames todavía.
- No Pixel.
- No CAPI.
- No CRM.
- No self-service owner.
- No deploy.
- No push.
- No secrets.

## Riesgos y Pendientes

- `isPrimary` se mantiene por acción transaccional, pero no hay constraint única parcial en DB.
- `custom-hostname.jakawi.com` es placeholder hasta Cloudflare Custom Hostnames v1.
- Los links internos canónicos por dominio directo siguen pendientes de aplicación global.
- No hay verificación DNS real; los estados son manuales.

## Siguiente Hito

Cloudflare Custom Hostnames v1:

- crear custom hostname vía API.
- leer estado SSL/provisioning.
- verificación DNS asistida.
- mantener separación de medición entre JAKAWI plataforma y tiendas.
