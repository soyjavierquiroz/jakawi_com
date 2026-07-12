# Exitosos Canonical Apex Finalization

Status: PASS
Date: 2026-07-12 00:58 UTC
QA_DIR: `/var/backups/jakawi.com/qa/finalize-exitosos-canonical-apex/20260712-004501`

## Domains

- Canonical: `exitosos.com`
- Redirect alias: `www.exitosos.com`
- CNAME target: `proxy-fallback.jakawi.com`
- DNS apex resolved: yes
- DNS `www` CNAME resolved to target: yes

## Cloudflare For SaaS

- Apex custom hostname status: active
- Apex SSL status: active
- Apex SSL wildcard: false
- Exact `www.exitosos.com` custom hostname status: active
- Exact `www.exitosos.com` cleanup: no
- Cleanup reason: apex certificate reported `ssl.wildcard=false` and only listed `exitosos.com`, so releasing the exact `www` hostname was not safe.
- Slot saved: no

## StoreDomain

- Store slug: `javier`
- Store name: Exitosos
- `exitosos.com`: `ACTIVE`, primary true, SSL active
- `www.exitosos.com`: `ACTIVE`, primary false
- Redirect-only field: not present in schema
- Redirect behavior: derived from active apex canonical domain and server-side canonical redirect logic

## Deploy

- Deploy: yes
- Reason: Traefik needed the apex host route and the app needed runtime redirect behavior for `www` to apex.
- Image: `jakawi-com-web:latest`
- Service: `jakawi_com_web`

## QA

- `https://jakawi.com/api/health`: database ok
- `https://exitosos.com`: shows Exitosos
- `https://exitosos.com/p/caesar-with-chicken`: product loads
- `https://www.exitosos.com`: 308 redirect to `https://exitosos.com`
- Product path preserved with `www` follow: yes
- No JAKAWI landing on apex: yes
- No redirect loop observed: yes
- Secrets exposed: no

## Verification Commands

- `npx prisma validate`: pass
- `npx prisma generate`: pass
- `npm run test --if-present`: pass
- `npm run typecheck --if-present`: pass
- `npm run lint --if-present`: pass
