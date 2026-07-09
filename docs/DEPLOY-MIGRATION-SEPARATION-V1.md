# Deploy Migration Separation v1

Estado: PASS

## Objetivo

Separar `prisma migrate deploy` del startup del contenedor web para que `jakawi_com_web` no ejecute migraciones automáticamente cada vez que arranca.

## Motivo

`JAKAWI Release Batch v16` quedó `BLOCKED` porque el startup de la imagen web ejecutaba migraciones Prisma antes de iniciar la app. Eso impedía cumplir releases donde `migrate deploy` debe ejecutarse sólo de forma explícita y controlada.

Decisión aplicada:

- No autorizar `migrate deploy` automático en startup.
- El web container debe arrancar con `pnpm start`.
- Las migraciones deben ejecutarse sólo con script/comando explícito durante releases con migraciones pendientes reales y autorizadas.

## Cambio aplicado

### Dockerfile final

`app/Dockerfile` ahora termina con:

```dockerfile
CMD ["pnpm", "start"]
```

Ya no arranca con una cadena shell que ejecute migraciones antes de iniciar la app.

### Script explícito de migraciones

Se creó:

- `scripts/run-prisma-migrate-deploy.sh`

El script:

- detecta repo/app desde su ubicación;
- requiere `DATABASE_URL` presente;
- no imprime el valor de `DATABASE_URL`;
- ejecuta:
  - `npx prisma migrate status`
  - `npx prisma migrate deploy`
  - `npx prisma migrate status`
- si `QA_DIR` está definido, guarda evidencia en `$QA_DIR/evidence`;
- falla con exit distinto de cero si status/deploy falla.

Importante: este script no se ejecutó en esta tarea.

### Deploy preflight

`scripts/deploy-preflight.sh` ahora valida separación de migraciones:

- PASS si el Dockerfile no contiene startup web con migrate deploy antes de `pnpm start`;
- FAIL si vuelve a aparecer ese patrón.

Salida esperada incluye:

```text
MIGRATION_STARTUP_SEPARATED=pass
```

### Runbook

`docs/DEPLOY-SAFETY-RUNBOOK-V1.md` fue actualizado:

- el web container ya no ejecuta migraciones en startup;
- releases con migraciones deben ejecutar `scripts/run-prisma-migrate-deploy.sh` explícitamente;
- releases sin migraciones sólo validan `migrate status`;
- nunca imprimir `DATABASE_URL`.

## Qué no se ejecutó

- `prisma migrate deploy`: no
- DB writes: no
- Deploy: no
- Contenedor contra producción: no
- Migraciones Prisma nuevas: no
- APIs externas: no

## Validaciones

- `scripts/deploy-preflight.sh`: PASS
- Prisma validate: PASS
- Prisma generate: PASS
- Tests: PASS, 135/135
- Typecheck: PASS
- Lint: PASS, 0 warnings
- Docker build local: PASS
- Imagen temporal inspeccionada: PASS

Imagen local construida:

- `jakawi-com-web:migration-separation-v1`

CMD/entrypoint inspeccionado:

```text
["pnpm","start"] ["docker-entrypoint.sh"]
```

El CMD de la imagen no contiene `prisma migrate deploy`.

## Safety grep

- Cadena prohibida de startup anterior en Dockerfile/infra/scripts/docs: 0 hits
- Referencias aceptables a `prisma migrate deploy`:
  - `scripts/run-prisma-migrate-deploy.sh`
  - `scripts/deploy-preflight.sh`
  - runbook/docs operativos o históricos

## Manejo de releases futuros

Para cada release:

1. Ejecutar preflight.
2. Validar `prisma migrate status`.
3. Si no hay migraciones pendientes reales: no ejecutar `migrate deploy`.
4. Si hay migraciones pendientes reales y autorizadas:
   - cargar `.env.stack` sin imprimir valores;
   - ejecutar `scripts/run-prisma-migrate-deploy.sh`;
   - guardar evidencia;
   - validar status final.
5. Construir/deployar imagen web sólo después de migración explícita, si aplica.

## Seguridad

- Secrets exposed: no
- No se imprimió `DATABASE_URL`
- No se imprimió `SESSION_SECRET`
- No se imprimió `APP_ENCRYPTION_KEY`
- No se imprimió `CLOUDFLARE_API_TOKEN`
- No se imprimió `SMTP_PASSWORD`
- No cookies completas
- No tokens largos

## Siguiente hito recomendado

- `Release Batch v16 retry`
