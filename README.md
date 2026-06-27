# JAKAWI

MVP SaaS de social commerce para crear una tienda publica, compartir productos y recibir consultas por WhatsApp.

## Stack

- Next.js App Router, React, TypeScript y Tailwind CSS
- PostgreSQL 16 con Prisma
- Redis 7
- MinIO S3 compatible para imagenes
- Docker Swarm con Traefik en `drenvex_network`

## Estructura

- `app/`: aplicacion Next.js
- `app/prisma/`: schema, migraciones y seed
- `infra/docker-stack.yml`: stack Swarm `jakawi_com`
- `.env.stack`: variables reales del stack, no se commitea

## Local

```bash
cd /var/opt/jakawi.com/app
pnpm install
pnpm prisma generate
pnpm build
pnpm dev
```

## Deploy

```bash
cd /var/opt/jakawi.com
set -a
source .env.stack
set +a
docker build -t jakawi-com-web:latest ./app
docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com
docker stack services jakawi_com
```

Seed demo:

```bash
docker run --rm \
  --network jakawi_com_jakawi_internal \
  --env-file /var/opt/jakawi.com/.env.stack \
  jakawi-com-web:latest \
  pnpm seed
```

## Dominios

- `jakawi.com` y `www.jakawi.com`: web Next.js
- `media.jakawi.com`: API S3 publica de MinIO
- `minio.jakawi.com`: consola MinIO con basic auth Traefik

DNS esperado:

- `A jakawi.com -> IP del servidor`
- `A www.jakawi.com -> IP del servidor`
- `A media.jakawi.com -> IP del servidor`
- `A minio.jakawi.com -> IP del servidor`

## Logs

```bash
docker service logs jakawi_com_web --tail 100 -f
docker service logs jakawi_com_postgres --tail 100
docker service logs jakawi_com_minio --tail 100
```

## Credenciales demo

- Email: `demo@jakawi.com`
- Password: `DemoJAKAWI2026!`
- Tienda: `https://jakawi.com/megalon`

## Rotacion de secretos

Rotar todos los valores reales de `.env.stack`: passwords de PostgreSQL, Redis y MinIO, `SESSION_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `UPLOAD_SECRET`, `S3_SECRET_KEY` y basic auth de MinIO. Despues de rotar, redeploy del stack.
