# Custom Domains Manual Beta QA v1

## Resultado

**WARN**

Custom Domains Manual Beta v1 queda funcionalmente validado. El único pendiente es la validación visual autenticada: el host no dispone de `agent-browser` y no se identificó una sesión owner o superadmin segura reutilizable. No se fabricaron sesiones ni screenshots.

Este WARN permite avanzar a **Release Batch v15**, manteniendo visual/auth como pendiente explícito.

## Alcance

- QA_DIR: `/var/backups/jakawi.com/qa/custom-domains-manual-beta-qa-v1/20260709-141828`
- Commit validado: `50859aa295f44a45d5c222c4fae3fe274a8a2c3c`
- Ruta owner: `/app/dominios`
- Ruta superadmin: `/app/admin/domains`
- QA read-only: sí
- Datos reales modificados: no

## Validaciones base

| Validación | Resultado |
| --- | --- |
| Prisma validate | PASS |
| Prisma generate | PASS |
| Tests | PASS, 127/127 |
| Typecheck | PASS |
| Lint | PASS, 0 warnings |
| `git diff --check` | PASS |

Prisma se validó con una URL PostgreSQL local ficticia exclusivamente para satisfacer la configuración del schema. `prisma validate` y `prisma generate` no conectaron a base de datos ni ejecutaron migraciones.

## Owner UI

Resultado funcional: **PASS por tests e inspección**.

- la ruta usa `requireStore()`;
- consulta únicamente `StoreDomain` con `storeId` de la tienda autenticada;
- la acción busca la tienda con `id + ownerId`;
- `canOwnerRequestDomain()` rechaza una tienda ajena;
- un hostname válido se crea como `CUSTOM_DOMAIN`;
- la solicitud queda `PENDING`;
- `isPrimary=false`;
- no se marca `ACTIVE` automáticamente;
- muestra instrucciones DNS manuales CNAME/TXT;
- no muestra ID privado de Cloudflare;
- no muestra tokens API ni secretos.

Resultado visual/auth: **no**. No había browser CLI ni sesión owner segura. No se envió el formulario y no se modificaron datos reales.

## Admin UI

Resultado funcional: **PASS por tests e inspección**.

- `/app/admin/domains` ejecuta `requireSuperAdmin()`;
- `requireSuperAdmin()` exige usuario autenticado y responde `notFound()` a roles no superadmin;
- crear manualmente, actualizar estado y marcar primary exigen `requireSuperAdmin()`;
- puede listar solicitudes;
- puede marcar primary;
- soporta:
  - `pending`;
  - `verification_pending`;
  - `verified`;
  - `active`;
  - `failed`;
  - `disabled`;
- no importa ni invoca provisioning/refresco Cloudflare;
- no contiene `fetch()` ni lookup DNS;
- cambiar estado no activa tráfico mientras el flag runtime está apagado.

Resultado visual/auth: **no**. No había browser CLI ni sesión superadmin segura. No se ejecutaron acciones administrativas ni se modificaron datos reales.

## Permisos

Resultado: **PASS**.

- owner limitado a dominios de su propia tienda;
- owner no puede solicitar para una tienda ajena;
- owner no puede cambiar estado ni primary;
- usuario owner normal no puede acceder a la ruta superadmin;
- toda mutación administrativa de esta superficie exige `requireSuperAdmin()`.

## Validación de dominios

Resultado: **PASS**.

Tests confirmados:

- `https://www.midominio.com/path` se normaliza a `www.midominio.com`;
- rechaza `localhost`;
- rechaza IPv4 pública o privada;
- rechaza `jakawi.com`;
- rechaza `www.jakawi.com`, `media.jakawi.com`, `crm.jakawi.com` y `minio.jakawi.com`;
- acepta `tienda.com`;
- acepta `www.tienda.com`;
- rechaza hostname duplicado;
- owner no puede solicitar para otra tienda;
- instrucciones DNS contienen solo valores públicos esperados.

## Runtime y tráfico custom

Verificación read-only del servicio y archivo:

```text
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
```

Resultado: **PASS**.

Con flags apagados:

- las solicitudes pueden existir en DB;
- superadmin puede revisar estados;
- `resolveStoreFromHost()` retorna `null` antes de consultar DB;
- el test confirma cero consultas DB para un custom Host;
- un custom Host real no resuelve una tienda;
- tráfico custom activado: no.

No se cambió ninguna variable runtime.

## Migración pendiente

Migración pendiente: **sí**.

- `000024_extend_store_domains_manual_beta` existe;
- contiene únicamente `ALTER TYPE "StoreDomainStatus" ADD VALUE IF NOT EXISTS 'VERIFIED'`;
- agrega el estado requerido;
- no elimina datos;
- no modifica tablas no relacionadas;
- no se ejecutó `prisma migrate deploy`;
- queda pendiente para **Release Batch v15**.

## Integraciones y seguridad

- Cloudflare API llamada: no
- DNS automático: no
- tráfico custom activado: no
- CRM: no
- Meta/TikTok/Google: no
- CAPI QA: no
- emails reales: no
- pagos reales: no
- checkout: no
- APIs externas: no
- tokens/secrets exposed: no
- datos reales modificados: no
- deploy: no
- push: no

La inspección de las superficies owner/admin no encontró `fetch`, lookup DNS, acciones Cloudflare, CRM, email, pago ni plataformas publicitarias.

## Visual/auth

- Visual/auth validation: no
- Screenshots: no
- Motivo exacto del WARN: `agent-browser` no está instalado y no existe una sesión owner/superadmin segura identificada.
- No se fabricaron screenshots.

Pendiente para una sesión controlada:

- abrir `/app/dominios` como owner;
- abrir `/app/admin/domains` como superadmin;
- revisar layout responsive, estados, instrucciones y controles manuales;
- guardar screenshots solo en el QA_DIR.

## Siguiente hito recomendado

**Release Batch v15**, porque el único WARN es visual/auth.

Si la futura validación autenticada descubre un bug funcional, usar **Custom Domains Manual Beta Fix v1** antes del release.
