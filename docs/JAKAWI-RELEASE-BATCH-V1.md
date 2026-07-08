# JAKAWI Release Batch v1

## Resultado

PASS.

Se desplego de forma controlada el `main` local actual para que produccion tenga las migraciones y features ya cerradas localmente. No se hizo push.

## Evidencia

- Fecha UTC: 2026-07-08.
- QA_DIR: `/var/backups/jakawi.com/qa/jakawi-release-batch-v1/20260708-011900`
- Repo: `/var/opt/jakawi.com`
- Branch: `main`
- Commit desplegado: `ff221afa4abc2314568f3e299b63f74673ae0271`
- Imagen construida: `jakawi-com-web:latest`
- Image ID: `sha256:6d308adcab4df0789b4478f361616024702ba69a19dc63825bce16d389661592`
- Servicio actualizado: `jakawi_com_web`

Archivos principales:

- `evidence/git-state.txt`
- `evidence/recent-commits.txt`
- `evidence/preflight-status.txt`
- `evidence/postgres-backup-summary.txt`
- `evidence/prisma-migrate-deploy.txt`
- `evidence/docker-build.txt`
- `evidence/docker-stack-deploy.txt`
- `evidence/docker-service-ps-after-deploy.txt`
- `evidence/docker-service-logs-initial.txt`
- `evidence/post-deploy-smoke-summary.txt`
- `evidence/runtime-schema-tables.txt`
- `evidence/runtime-env-redacted.txt`

## Preflight

- Working tree inicial: limpio.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npm run test --if-present`: PASS.
- `npm run typecheck --if-present`: PASS.
- `npm run lint --if-present`: PASS.

## Backup DB

Backup Postgres creado antes de migrar:

- Estado: PASS.
- Ruta: `/var/backups/jakawi.com/manual/20260708-012121/postgres/jakawi-postgres-20260708-012121.dump`
- Tamano: `200545` bytes.
- Restore list: `225` lineas.
- Secretos impresos: no.

## Migraciones Aplicadas

`prisma migrate deploy` se ejecuto desde un contenedor temporal en la red interna `jakawi_com_jakawi_internal`, porque el host no resuelve `postgres:5432`.

Migraciones aplicadas:

- `000020_add_auth_tokens`
- `000021_add_store_domains`
- `000022_add_first_party_tracking_events`
- `000023_add_store_pixel_integrations`

## Flags Finales

Runtime final redacted:

```text
CRM_WEBHOOK_ENABLED=false
CRM_WEBHOOK_QA_ONLY=true
CUSTOM_DOMAINS_ENABLED=false
CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=false
META_CAPI_ENABLED=false
META_CAPI_GRAPH_VERSION=v20.0
META_CAPI_TIMEOUT_MS=5000
EMAIL_DELIVERY_MODE=disabled
APP_ENCRYPTION_KEY_present=yes
```

## Smoke Results

- `https://jakawi.com`: 200.
- `https://jakawi.com/api/health`: 200, database ok.
- `https://jakawi.com/login`: 200.
- `https://jakawi.com/registro`: 200.
- `https://jakawi.com/app`: 307, redirige si no hay auth.
- `https://jakawi.com/qa-onboarding-store`: 200.
- `https://jakawi.com/qa-onboarding-store/p/qa-producto-demo`: 200.
- `https://jakawi.com/app/integraciones`: 307, redirige si no hay auth.

## Tablas Confirmadas

- `AuthToken`: present.
- `StoreDomain`: present.
- `TrackingEvent`: present.
- `StorePixelIntegration`: present.

## Controles

- No push.
- No CRM activado.
- No custom domains activados.
- No Cloudflare API activada.
- No Meta CAPI activado.
- No Pixel/CAPI QA enviado.
- No pagos.
- No emails reales.
- No secretos en docs/evidencia saneada.
- Traefik no fue modificado manualmente.
- Cloudflare no fue tocado.

## Riesgos

- El stack versionado no listaba todas las flags nuevas del servicio web; para este release se uso una copia temporal del stack con referencias a variables existentes en `.env.stack`.
- `docker stack deploy` reporto actualizacion de servicios del stack, pero el estado final quedo `1/1` para servicios principales.
- `APP_ENCRYPTION_KEY` quedo presente para uso futuro de tokens cifrados, pero Meta CAPI permanece apagado.

## Rollback Notes

- Commit desplegado: `ff221afa4abc2314568f3e299b63f74673ae0271`.
- Imagen previa no fue eliminada explicitamente.
- Para rollback de app, reconstruir o retaguear la imagen anterior conocida y ejecutar `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com` seguido de `docker service update --force jakawi_com_web`.
- Las migraciones aplicadas son de avance. No ejecutar rollback destructivo de DB sin ventana, backup verificado y plan especifico.
- Backup previo disponible en `/var/backups/jakawi.com/manual/20260708-012121/postgres/`.

## Siguiente Hito

Reintentar **Meta CAPI Controlled QA v1** con runtime actualizado, manteniendo `META_CAPI_ENABLED=false` hasta la ventana controlada de QA.
