# Custom Domains Manual Beta v1

## Objetivo

Habilitar una operación beta asistida para que el owner solicite un dominio personalizado de su propia tienda y un superadmin revise DNS, estado y dominio principal manualmente.

Esta entrega guarda solicitudes y decisiones operativas en `StoreDomain`. No provisiona infraestructura ni habilita tráfico custom.

## Rutas

- Owner: `/app/dominios`
  - muestra el dominio custom principal, si existe;
  - lista solicitudes y sus instrucciones DNS;
  - permite solicitar un nuevo hostname para la tienda autenticada.
- Superadmin: `/app/admin/domains`
  - lista solicitudes con tienda y owner redactado;
  - permite crear una solicitud manual;
  - permite cambiar estado y marcar primary;
  - está protegida con `requireSuperAdmin()`.

## Modelo, campos y estados

Se reutiliza `StoreDomain`:

- `storeId`
- `hostname`
- `type=CUSTOM_DOMAIN`
- `status`
- `isPrimary`
- `verificationType`
- `verificationValue`
- timestamps operativos existentes

Estados visibles:

- `PENDING` → `pending`
- `VERIFYING` → `verification_pending`
- `VERIFIED` → `verified`
- `ACTIVE` → `active`
- `FAILED` → `failed`
- `DISABLED` → `disabled`

Una solicitud owner siempre se crea como `CUSTOM_DOMAIN`, `PENDING`, no primary y con verificación DNS manual. `ACTIVE` registra una decisión administrativa, pero no habilita resolución real mientras el flag runtime esté apagado.

No existe un campo seguro de nota interna en `StoreDomain`; por eso esta versión no agrega ni improvisa notas administrativas.

## Validación del dominio

El helper `app/src/lib/custom-domains.ts` implementa:

- `normalizeDomainInput()`
- `validateCustomDomain()`
- `buildDnsInstructions()`
- `canOwnerRequestDomain()`
- `deriveDomainStatusLabel()`
- `isJakawiReservedDomain()`

La entrada:

- es requerida;
- se normaliza a lowercase;
- elimina `http://` o `https://`;
- elimina path, query, fragmento, puerto y punto final;
- rechaza localhost;
- rechaza direcciones IP;
- rechaza hostnames DNS inválidos;
- rechaza duplicados mediante el índice único de `StoreDomain.hostname`;
- nunca activa el dominio automáticamente.

Dominios reservados:

- `jakawi.com`
- `www.jakawi.com`
- `media.jakawi.com`
- `crm.jakawi.com`
- `minio.jakawi.com`

Además, un subdominio de `jakawi.com` no puede registrarse como `CUSTOM_DOMAIN`.

## DNS manual

La UI genera instrucciones públicas:

- `CNAME <hostname> -> <fallback origin configurado>`, o `jakawi.com` si no hay target configurado;
- `TXT <hostname> -> <verificationValue>` cuando el registro ya contiene un valor de verificación.

`StoreDomain` soporta `verificationValue`, por lo que las solicitudes nuevas usan un valor manual derivado del hostname. Las instrucciones no muestran `cloudflareHostnameId`, token API, credenciales ni secretos.

JAKAWI debe validar DNS antes de marcar el dominio como verificado o activo. No hay consulta DNS automática.

## Permisos

- Owner:
  - requiere sesión;
  - consulta dominios filtrados por `storeId` de su propia tienda;
  - la acción busca `id + ownerId` y rechaza cualquier tienda ajena;
  - solo puede solicitar; no cambia estados ni primary.
- Superadmin:
  - la ruta exige `requireSuperAdmin()`;
  - crear, actualizar estado y marcar primary exigen `requireSuperAdmin()`;
  - el email del owner se muestra redactado;
  - no se muestran IDs privados de Cloudflare.

## Runtime seguro y flags finales

Estado final esperado:

```text
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
```

Con estos flags apagados:

- owner puede guardar solicitudes;
- superadmin puede revisar y cambiar estados;
- `resolveStoreFromHost()` retorna antes de consultar DB;
- ningún dominio custom acepta tráfico real por Host;
- la pantalla manual no ofrece provisioning ni refresh de Cloudflare.

## Qué NO hace

- no Cloudflare API;
- no DNS automático;
- no activación real de tráfico custom;
- no deploy;
- no push;
- no pagos reales;
- no checkout;
- no emails reales;
- no CRM;
- no Meta, TikTok ni Google;
- no CAPI QA;
- no datos reales modificados;
- no secretos expuestos.

## Migración Prisma

Sí: `000024_extend_store_domains_manual_beta`.

La migración agrega `VERIFIED` al enum `StoreDomainStatus`. No crea otra tabla ni duplica `StoreDomain`.

La migración queda pendiente para un release controlado. En esta tarea no se ejecutó `prisma migrate deploy` ni se modificaron datos reales.

## Validaciones

Matriz requerida:

- `npx prisma validate`
- `npx prisma generate`
- `npm run test --if-present`
- `npm run typecheck --if-present`
- `npm run lint --if-present`
- `git diff --check`
- verificaciones documentales finales
- secret scan redactado del QA_DIR

Resultados:

- Prisma validate: PASS, con URL PostgreSQL local ficticia únicamente para resolver el requisito de configuración; no hubo conexión.
- Prisma generate: PASS.
- tests: PASS, 127/127.
- typecheck: PASS.
- lint: PASS, 0 warnings.
- runtime flags read-only: ambos confirmados en `false`.
- secret scan de evidencia: PASS.
- visual/auth: pendiente.

Los logs definitivos quedan en el QA_DIR reportado al cierre.

## Validación visual

No realizada en esta implementación: no existe una sesión owner/superadmin segura reutilizable confirmada. No se fabricaron sesiones ni screenshots.

Pendiente validar con sesión autorizada:

- `/app/dominios` como owner;
- `/app/admin/domains` como superadmin;
- responsive owner/admin;
- mensajes de éxito/error y estados.

## Siguiente hito recomendado

1. **Custom Domains Manual Beta QA v1**
2. luego **Release Batch v15**
