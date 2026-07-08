# Deploy Safety Runbook v1

## Objetivo

Evitar releases Docker Stack con variables sustituidas vacias por ejecutar `docker stack deploy` sin cargar `.env.stack`.

Este runbook es operativo y corto. No cambia runtime, no despliega por si solo y no debe imprimir secretos.

## Regla critica

Nunca ejecutar `docker stack deploy` sin cargar `.env.stack` en el shell del proceso de deploy.

Incidente que previene: en Release Batch v4 el primer deploy corrio sin `.env.stack`; Docker sustituyo variables vacias, `DATABASE_URL` quedo vacio, `jakawi_com_web` reinicio temporalmente y se recupero cargando `.env.stack` antes del redeploy.

## Cargar env sin imprimir secrets

Desde la maquina autorizada:

```bash
cd /var/opt/jakawi.com
set -a
. /var/opt/jakawi.com/.env.stack
set +a
```

No usar `set -x`. No ejecutar `env`, `printenv` ni `cat .env.stack` en logs compartidos.

## Preflight obligatorio

Antes de build/deploy, validar presencia de variables criticas con salida redacted.

Variables criticas:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_ENCRYPTION_KEY`
- `CRM_WEBHOOK_ENABLED`
- `CUSTOM_DOMAINS_ENABLED`
- `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED`
- `META_CAPI_ENABLED`
- `EMAIL_DELIVERY_MODE`

Nota de auth: el stack real usa `SESSION_SECRET`. `NEXTAUTH_SECRET` y `AUTH_SECRET` pueden aparecer en referencias historicas o compatibilidad, pero no son el nombre operativo actual del stack.

Comando recomendado:

```bash
cd /var/opt/jakawi.com
scripts/deploy-preflight.sh
```

Salida permitida:

```text
DATABASE_URL=present
SESSION_SECRET=present
APP_ENCRYPTION_KEY=present
CRM_WEBHOOK_ENABLED=present
CUSTOM_DOMAINS_ENABLED=present
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=present
META_CAPI_ENABLED=present
EMAIL_DELIVERY_MODE=present
PASS deploy preflight
```

Si falta una variable o esta vacia, la salida debe ser solo:

```text
VAR=missing
FAIL deploy preflight
```

Nunca imprimir valores.

## Deploy seguro

Ejecutar solo despues de preflight PASS, validaciones locales PASS y ventana aprobada:

```bash
cd /var/opt/jakawi.com
set -a
. .env.stack
set +a
docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com
```

Si se construyo una imagen local nueva y Swarm no recrea el contenedor web:

```bash
docker service update --force jakawi_com_web
```

## Post-deploy smoke

Validar rutas publicas y owner sin imprimir cookies, tokens ni credenciales:

```bash
curl -fsS https://jakawi.com >/dev/null
curl -fsS https://jakawi.com/api/health
curl -fsSI https://jakawi.com/login >/dev/null
curl -fsSI https://jakawi.com/registro >/dev/null
curl -fsSI https://jakawi.com/app >/dev/null
curl -fsSI https://jakawi.com/app/integraciones >/dev/null
curl -fsSI https://jakawi.com/qa-onboarding-store >/dev/null
curl -fsSI https://jakawi.com/qa-onboarding-store/p/qa-producto-demo >/dev/null
```

Rutas esperadas:

- `https://jakawi.com`
- `https://jakawi.com/api/health`
- `https://jakawi.com/login`
- `https://jakawi.com/registro`
- `https://jakawi.com/app`
- `https://jakawi.com/app/integraciones`
- `https://jakawi.com/qa-onboarding-store`
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`

## Flags runtime finales esperadas

Estado seguro esperado despues del release:

```text
CRM_WEBHOOK_ENABLED=false
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
EMAIL_DELIVERY_MODE=disabled
```

Verificar de forma redacted o con salida de valores no secretos aprobados. No imprimir `DATABASE_URL`, secrets, tokens ni passwords.

## Rollback notes

- No hacer rollback destructivo de DB sin backup verificado.
- Si hubo migraciones, confirmar compatibilidad antes de volver a una imagen anterior.
- Para rollback de app, usar imagen previa o tag conocido.
- Redeployar con `.env.stack` cargado.
- Verificar tareas con `docker service ps jakawi_com_web --no-trunc`.
- Verificar `UpdateStatus` del servicio antes de declarar recuperacion.

Comandos de inspeccion:

```bash
docker service ps jakawi_com_web --no-trunc
docker service inspect jakawi_com_web --format '{{json .UpdateStatus}}'
docker stack services jakawi_com
```

## Checklist rapido para releases

- Working tree limpio.
- `npm run test --if-present`.
- `npm run typecheck --if-present`.
- `npm run lint --if-present`.
- `npx prisma migrate status`.
- Backup DB si hay migraciones.
- `scripts/deploy-preflight.sh` PASS.
- Build de imagen.
- Deploy con `.env.stack` cargado.
- Smoke post-deploy.
- Flags finales verificadas con salida redacted.
- Commit de docs del release.
