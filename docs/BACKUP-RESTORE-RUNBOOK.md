# JAKAWI - Backup / Restore Runbook Draft

Estado: draft seguro. No ejecutar sobre produccion sin ventana, responsable y aprobacion.
Ultima actualizacion: 2026-07-01.

## 1. Objetivo

Definir un proceso minimo para proteger datos de Postgres y objetos de MinIO antes de pilotos pagos. Este sprint no ejecuta backup ni restore real.

## 2. Servicios y volumenes

- Postgres: volumen `jakawi_postgres_data`.
- MinIO: volumen `jakawi_minio_data`.
- Redis: volumen `jakawi_redis_data` opcional para cache/estado efimero.

## 3. RPO/RTO sugeridos para private beta

- RPO inicial: maximo 24 horas para Postgres y MinIO.
- RTO inicial: 4 a 8 horas para restaurar un entorno funcional con asistencia manual.
- Revisar estos objetivos antes de aceptar pilotos pagos con operaciones criticas.

## 4. Backup Postgres sugerido

Verificar variables desde `.env.stack` solo en la maquina autorizada. No imprimir secretos en logs.

Ejemplo de patron:

```bash
set -a
source .env.stack
set +a

mkdir -p backups/postgres
docker run --rm \
  --network jakawi_com_jakawi_internal \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  -v "$PWD/backups/postgres:/backups" \
  postgres:16-alpine \
  pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --file="/backups/jakawi-postgres-$(date -u +%Y%m%d-%H%M%S).dump"
```

Verificacion minima:

```bash
ls -lh backups/postgres
```

No subir dumps a git.

## 5. Backup MinIO sugerido

Elegir una estrategia y verificar herramienta disponible antes de usarla:

- Snapshot del volumen en el host si la plataforma lo soporta.
- `mc mirror` hacia un destino seguro.
- `rsync`/snapshot de datos del volumen con el servicio detenido o consistencia validada.

Ejemplo conceptual con MinIO Client:

```bash
mc alias set jakawi-prod https://media.jakawi.com "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mirror --overwrite jakawi-prod/<bucket> /ruta/segura/backups/minio/<fecha>
```

El bucket real y credenciales deben verificarse en entorno seguro. No escribir secretos en documentos, commits o tickets publicos.

## 6. Redis

Redis puede tratarse como cache/estado recuperable salvo que se confirme uso persistente critico. Para private beta, documentar si se necesita snapshot o si puede reconstruirse.

## 7. Restore drill en entorno separado

No hacer restore sobre produccion para probar. Crear un entorno separado o temporal.

Pasos sugeridos:

1. Crear Postgres temporal.
2. Restaurar dump con `pg_restore`.
3. Levantar app apuntando a DB temporal.
4. Restaurar o montar copia de MinIO en bucket temporal.
5. Probar health, login de cuenta QA y carga de imagenes.
6. Registrar tiempos, errores y responsable.

Ejemplo conceptual:

```bash
pg_restore -h <host-temporal> -U <user-temporal> -d <db-temporal> --clean --if-exists <dump>
```

## 8. Verificacion de restore

- `SELECT 1` responde.
- Conteos principales coinciden razonablemente.
- Stores, products, leads y payments aparecen.
- Objetos MinIO referenciados cargan.
- `/api/health` responde OK en entorno separado.
- No hay secretos expuestos en logs.

## 9. Frecuencia minima

- Postgres: diario, retencion minima 7 dias para private beta.
- MinIO: diario o snapshot despues de cambios relevantes de media.
- Restore drill: antes del primer piloto pago y luego mensual mientras haya clientes reales.

## 10. Responsables

- Responsable operativo: CTO/operador de infraestructura.
- Responsable de verificacion: persona distinta cuando sea posible.
- Responsable de aprobacion de restore en produccion: owner tecnico del servicio.

## 11. Advertencias

- No restaurar sobre produccion sin ventana, aprobacion y plan de rollback.
- No exponer dumps ni objetos privados.
- Cifrar backups en reposo y transporte.
- Probar restore antes de piloto pago.
- Mantener backups fuera del repo.
- Documentar cada ejecucion con fecha UTC, tamano, destino y resultado.
