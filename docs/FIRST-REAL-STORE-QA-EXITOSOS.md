# First Real Store QA - Exitosos

Status: PASS

QA_DIR: `/var/backups/jakawi.com/qa/first-real-store-qa-exitosos/20260710-164301`

Home result: PASS. `https://www.exitosos.com` returns 200 and shows the `Javier` storefront with products. It does not show the generic JAKAWI home hero, login, or admin UI.

Product result: PASS. Product `caesar-with-chicken` loads from both `https://www.exitosos.com/p/caesar-with-chicken` and `https://jakawi.com/javier/p/caesar-with-chicken` with 200 responses. Name, price, and image are visible.

Mobile result: PASS. Home and product load with a mobile Safari user agent.

Privacy result: PASS. No visible privacy/banner element was detected in server-rendered home or product markup, and critical content remains visible.

Custom domain result: PASS. `CUSTOM_DOMAINS_ENABLED=true`, `CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=true`, and `https://www.exitosos.com` remains OK.

Issues found: The visible store brand is `Javier`; `Exitosos` is represented by the custom domain, not by visible page copy.

Recommended next step: Keep production as-is and use `www.exitosos.com` for real-store traffic.
