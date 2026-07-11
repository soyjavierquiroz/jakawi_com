# Handoff Resolve API PR2 Deploy

Status: BLOCKED

## PR

- PR: https://github.com/soyjavierquiroz/jakawi_com/pull/2
- Merge commit: d783c56dbee7ac45df48d224e5783a800f8e2848
- Deployed commit: d783c56dbee7ac45df48d224e5783a800f8e2848
- Endpoint: `POST /api/handoffs/resolve`

## Checks

- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npm run test --if-present`: PASS, 144/144
- `npm run typecheck --if-present`: PASS
- `npm run lint --if-present`: PASS
- `docker build -t jakawi-com-web:latest ./app`: PASS
- Docker image: `sha256:9c75b23759ae086289d25467efcf10cbed7d0b10c644387465ffd9fd243cc575`
- `docker stack deploy --resolve-image never -c infra/docker-stack.yml jakawi_com`: PASS
- `docker service update --force jakawi_com_web`: PASS, service converged

## Smoke

- `GET https://jakawi.com/api/health`: BLOCKED, HTTP 500, `database:error`
- `GET https://www.exitosos.com`: PASS, HTTP 200

## Negative Smoke

- Request: `POST https://jakawi.com/api/handoffs/resolve`
- Payload: fake handoff code and fake phone number
- Expected: HTTP 404 with `{"ok":false,"error":"Handoff not found"}`
- Actual: BLOCKED, HTTP 500 with empty body
- Context leaked: no

## Security

- Secrets exposed: no
- Token printed: no
- External calls: no OpenAI, WhatsApp, n8n, payments, or email calls were made
- Migrations: no migration and no migrate deploy
