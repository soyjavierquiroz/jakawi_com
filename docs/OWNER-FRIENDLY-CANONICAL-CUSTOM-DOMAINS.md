# Owner-Friendly Canonical Custom Domains

Status: implemented

## Product Rule

The owner writes one domain in JAKAWI and copies DNS records. JAKAWI handles canonicalization, Cloudflare for SaaS provisioning, SSL polling, storefront resolution, and the `www` redirect alias.

Owners do not provide Cloudflare tokens, do not create redirect rules, and do not use advanced configuration.

## Canonical Flow

Input examples:

- `exitosos.com` becomes canonical `exitosos.com` with redirect alias `www.exitosos.com`.
- `www.exitosos.com` becomes canonical `exitosos.com` with redirect alias `www.exitosos.com`.

The commercial custom hostname stored for the store is the canonical hostname. `www` is not counted as a second commercial domain.

## Cloudflare for SaaS

JAKAWI creates or reuses one Cloudflare custom hostname for the canonical domain:

- `hostname: exitosos.com`
- `wildcard: true`

If Cloudflare accepts `wildcard: true`, JAKAWI does not create a separate custom hostname for `www`.

If Cloudflare rejects `wildcard: true`, JAKAWI falls back to the canonical hostname without wildcard and does not create a second `www` hostname automatically. The product must be honest in that case: the main domain can work at `exitosos.com`, while automatic `www` without wildcard needs a second hostname or an external redirect.

## DNS Records for Exitosos

The owner copies these records at the DNS provider:

```text
CNAME @   proxy-fallback.jakawi.com
CNAME www proxy-fallback.jakawi.com
```

## Runtime Behavior

`exitosos.com` resolves the store directly when the canonical StoreDomain is ACTIVE.

`www.exitosos.com` redirects to `https://exitosos.com` with path and query preserved only after the canonical apex is ACTIVE. Until then, an existing exact `www` custom hostname can keep serving production traffic.

## States

- `PENDING_DNS`: StoreDomain is saved and waiting for owner DNS.
- `VERIFYING_SSL`: Cloudflare hostname exists and DNS/SSL is still verifying.
- `ACTIVE`: Cloudflare hostname and SSL are active, and the store is published.
- `WILDCARD_UNSUPPORTED`: Cloudflare rejected wildcard custom hostname support; JAKAWI must not pretend `www` is automatic from one hostname.

## Guardrails

- No Cloudflare token from the owner.
- No manual redirect rules for the owner.
- No second commercial domain for `www` when wildcard is supported.
- No cleanup of existing `www` hostnames until apex wildcard and SSL are confirmed active.
