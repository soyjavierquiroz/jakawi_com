# JAKAWI - Repo Safety / Backup v1

Fecha UTC: 2026-07-09T00:51:45Z
Repo: `/var/opt/jakawi.com`
QA_DIR: `/var/backups/jakawi.com/qa/repo-safety-backup-v1/20260709-005145`
Resultado global: **PASS**

## 1. Objetivo

Crear un backup verificable del estado actual del repo antes de cualquier push, deploy o cambio runtime, porque `main` contiene muchos commits locales ahead de `origin/main`.

## 2. Estado respaldado

| Campo | Resultado |
| --- | --- |
| HEAD respaldado | `6c18d14b012cf9f2ac0a177dc1fd57939c166033` |
| Branch | `main` |
| Estado contra remote | `main...origin/main [ahead 52]` |
| Ahead/behind contra `origin/main` | behind `0`, ahead `52` |
| Working tree pre-backup | Limpio |
| Tags locales | `180` |

## 3. Backup

| Campo | Resultado |
| --- | --- |
| Formato | `git bundle` |
| Bundle path | `/var/backups/jakawi.com/qa/repo-safety-backup-v1/20260709-005145/evidence/jakawi-repo-all-refs-20260709-005145.bundle` |
| Bundle size | `910K` |
| SHA256 | `c23b002f06450410b585159840596af1aa357ebf6aea07d30b2d03e9ce7ea1f2` |
| Bundle verify | PASS; bundle is okay, records complete history, hash algorithm `sha1` |

El backup incluye todos los refs locales disponibles via `git bundle create <bundle> --all`, incluyendo `refs/heads/main`, `refs/remotes/origin/main`, tags locales y refs locales adicionales presentes en el repositorio.

## 4. Restore test

| Check | Resultado |
| --- | --- |
| Clone desde bundle | PASS |
| Restore HEAD | `6c18d14b012cf9f2ac0a177dc1fd57939c166033` |
| HEAD original vs restore | PASS |
| Restore status | Limpio |
| Tags originales vs restore | PASS, `180` tags |

## 5. Lo que no hace

- No push.
- No deploy.
- No runtime changes.
- No APIs externas.
- No CRM.
- No Meta/TikTok/Google/Cloudflare.
- No pagos.
- No emails.
- No Prisma migrate.
- No app code.
- No secrets impresos.
- No copia de `.env.stack`.

## 6. Restaurar en emergencia

```bash
git clone /var/backups/jakawi.com/qa/repo-safety-backup-v1/20260709-005145/evidence/jakawi-repo-all-refs-20260709-005145.bundle restored-repo
```

Forma generica:

```bash
git clone <bundle> restored-repo
```

## 7. Evidencia

Archivos principales:

- `evidence/git-status-short.txt`
- `evidence/git-status-branch.txt`
- `evidence/git-head.txt`
- `evidence/git-log-oneline-decorate-80.txt`
- `evidence/git-tags-points-at-head.txt`
- `evidence/git-tags-all.txt`
- `evidence/git-ahead-behind-origin-main.txt`
- `evidence/jakawi-repo-all-refs-20260709-005145.bundle`
- `evidence/git-bundle-verify.txt`
- `evidence/git-bundle-sha256.txt`
- `evidence/git-bundle-clone-test.txt`
- `evidence/restore-test-head.txt`
- `evidence/restore-test-status-short.txt`
- `evidence/restore-test-tags.txt`

## 8. Siguiente hito recomendado

1. Email Delivery v1.
2. Manual Billing / Plan Ops v1.

