# Emergency Production Recovery: Exitosos + DB

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/emergency-prod-recovery-exitosos-db/20260711-195612`

## Summary

Production recovery was deployed from the known-good tag `fix-seller-ai-sales-style-selector-visibility`.

Recovery commit used: `12edc9a5821b3ffd735587d4da66a706fa7058f2`

Recovery branch: `recovery/prod-exitosos-db-20260711-195628`

Deploy: yes

Secrets exposed: no

## Probable Cause

The production web service appeared to be running an unhealthy application state where database health reported an error and the custom domain for `www.exitosos.com` fell through to the JAKAWI landing experience. Redeploying the known-good recovery tag with the existing stack environment restored database health and custom domain storefront routing.

## Validation

Health result: PASS

- `https://jakawi.com/api/health` returned HTTP 2xx.
- Response included `ok: true` and `database: ok`.

`www.exitosos.com` result: PASS

- `https://www.exitosos.com` returned HTTP 2xx.
- Visible page body shows `Exitosos`.
- Visible page body does not show the JAKAWI landing copy.

Product result: PASS

- `https://www.exitosos.com/p/caesar-with-chicken` returned HTTP 2xx.
- Visible page body shows `Caesar with Chicken` and `Exitosos`.

JAKAWI Javier result: PASS

- `https://jakawi.com/javier` returned HTTP 2xx.
- Visible page body shows the Exitosos storefront.

Handoff endpoint result: PASS

- `POST https://jakawi.com/api/handoffs/resolve` with a false code and false phone returned HTTP 404.
- Response body: `{"ok":false,"error":"Handoff not found"}`

## Checks

Minimum checks passed after loading `.env.stack` in the same shell:

- `npx prisma validate`
- `npx prisma generate`
- `npm run test --if-present`
- `npm run typecheck --if-present`
- `npm run lint --if-present`

Note: an initial `prisma validate` attempt failed because the shell executing checks had not inherited `DATABASE_URL`; `.env.stack` did contain `DATABASE_URL`, and the checks passed after loading it.

## Pending

- Order `main` so it contains the stable production state plus PR2 without breaking custom domains.
- Keep production stable before continuing unrelated PR work.
