# JAKAWI - Backup Restore Drill v1

Fecha UTC: 2026-07-01 23:04:58.
Commit auditado: `57f9983c`.
Entorno: produccion `https://jakawi.com`, Docker Swarm stack `jakawi_com`.
Operador: Codex como CTO / infra operator / senior backend engineer.
Resultado global: PASS.

## 1. Resumen ejecutivo

- Postgres backup: PASS.
- Postgres restore temporal: PASS.
- MinIO backup: PASS.
- MinIO restore temporal: PASS.
- Health post-drill: PASS.
- Decision: Backup/restore basico validado para private beta.

## 2. Alcance

Que se ejecuto:

- `pg_dump` de Postgres produccion en formato custom.
- `pg_restore` en contenedor Postgres temporal sin puertos publicados.
- Conteos agregados de produccion vs restore temporal.
- `mc mirror` de MinIO produccion hacia backup local externo al repo.
- Restore MinIO hacia contenedor temporal sin puertos publicados.

Que no se ejecuto:

- Restore sobre produccion.
- Deploy.
- Migraciones.
- Backup Redis.
- Cifrado externo.
- Backup automatico/scheduled.

## 3. Seguridad aplicada

- Backups fuera del repo en `/var/backups/jakawi.com/drills/20260701-230458/`.
- Directorios del drill con permisos `700`.
- No secretos en este documento.
- No datos personales en este documento.
- Restore solo en contenedores temporales.
- Contenedores temporales eliminados.
- No volumenes eliminados.
- No deploy.

## 4. Postgres backup

- Ruta del dump: `/var/backups/jakawi.com/drills/20260701-230458/postgres/jakawi-postgres-20260701-230458.dump`.
- Tamano: 188K.
- SHA-256: `c01b5f53ca3dd90fa6b51ee61cabe1fe31a3749491cb8a92a182e0e32f269989`.
- Lineas de `pg_restore --list`: 225.
- Estado: PASS.

## 5. Postgres restore drill

- Contenedor temporal: `jakawi_restore_pg_20260701-230458`.
- DB temporal: `jakawi_restore`.
- Resultado restore: PASS.
- Comparacion de conteos: PASS, diff vacio.

| Tabla | Produccion | Restore | Match |
| --- | ---: | ---: | --- |
| AcquisitionAttribution | 1 | 1 | yes |
| Category | 2 | 2 | yes |
| CommercialSnapshot | 7 | 7 | yes |
| Conversation | 72 | 72 | yes |
| ConversationMessage | 431 | 431 | yes |
| CustomerJourney | 64 | 64 | yes |
| GrowthLinkClick | 39 | 39 | yes |
| JourneyEvent | 1099 | 1099 | yes |
| Lead | 72 | 72 | yes |
| LeadEvent | 684 | 684 | yes |
| Partner | 1 | 1 | yes |
| PartnerCommission | 2 | 2 | yes |
| PartnerDestination | 2 | 2 | yes |
| Product | 11 | 11 | yes |
| Store | 3 | 3 | yes |
| StorePayment | 3 | 3 | yes |
| StoreReferralReward | 3 | 3 | yes |
| User | 3 | 3 | yes |

## 6. MinIO backup

- Herramienta usada: `minio/mc` container con `mc mirror`.
- Bucket respaldado: `jakawi-products`.
- Conteo de objetos/archivos respaldados: 25.
- Tamano local: 5.4M.
- Ruta backup local: `/var/backups/jakawi.com/drills/20260701-230458/minio/bucket`.
- Estado: PASS.

Nota operativa: la imagen `minio/mc` usada no incluye `find`; el conteo confiable del backup se valido desde el host y quedo registrado en evidencia externa.

## 7. MinIO restore drill

- Contenedor temporal: `jakawi_restore_minio_20260701-230458`.
- Bucket temporal: `jakawi-restore`.
- Conteo restaurado: 25.
- Comparacion con backup local: PASS, 25 respaldados vs 25 restaurados.
- Estado: PASS.
- Cleanup: contenedor temporal eliminado.

Nota operativa: el primer intento de alias con el nombre del contenedor fue rechazado por `mc` por hostname invalido con guiones bajos. El restore final uso un alias DNS temporal con guiones dentro de la red interna y no toco produccion.

## 8. Health y servicios post-drill

- Health result: `{"ok":true,"service":"jakawi.com","timestamp":"2026-07-01T23:08:32.822Z","database":"ok"}`.
- Servicios principales post-drill: `jakawi_com_postgres`, `jakawi_com_redis`, `jakawi_com_minio`, `jakawi_com_web` en estado `1/1`.
- Sin deploy.

## 9. Archivos de evidencia fuera del repo

- Dump: `/var/backups/jakawi.com/drills/20260701-230458/postgres/jakawi-postgres-20260701-230458.dump`.
- SHA-256: `/var/backups/jakawi.com/drills/20260701-230458/evidence/postgres-dump.sha256`.
- Restore list: `/var/backups/jakawi.com/drills/20260701-230458/evidence/postgres-restore-list.txt`.
- Counts prod CSV: `/var/backups/jakawi.com/drills/20260701-230458/evidence/postgres-prod-counts.csv`.
- Counts restore CSV: `/var/backups/jakawi.com/drills/20260701-230458/evidence/postgres-restore-counts.csv`.
- Counts diff: `/var/backups/jakawi.com/drills/20260701-230458/evidence/postgres-counts.diff`.
- MinIO backup output: `/var/backups/jakawi.com/drills/20260701-230458/evidence/minio-backup-output.txt`.
- MinIO restore output: `/var/backups/jakawi.com/drills/20260701-230458/evidence/minio-restore-output.txt`.

No commitear dumps, backups, manifests ni evidencia detallada fuera del repo.

## 10. Riesgos / pendientes

- Backups no estan automatizados todavia.
- No hay cifrado/rotacion automatica configurada para estos backups locales.
- Restore drill no reemplaza monitoreo.
- MinIO necesita politica definitiva de backup, retencion y destino externo.
- Redis no fue respaldado; se mantiene como cache/estado recuperable salvo decision contraria.
- Programar siguiente drill mensual.

## 11. Conclusion

Desde la perspectiva de backup basico, JAKAWI puede aceptar private beta controlada. Antes de pilotos pagos sostenidos falta convertir este proceso en backup automatico con retencion, cifrado, monitoreo de ejecucion, destino externo y drill mensual documentado.
