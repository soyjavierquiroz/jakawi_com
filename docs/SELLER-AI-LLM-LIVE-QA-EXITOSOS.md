# Seller AI LLM Live QA Exitosos

Status: PASS.

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-llm-live-qa-exitosos/20260710-204440`

## Model

- Requested model: `gpt-4.1-mini`
- Runtime `modelUsed`: `gpt-4.1-mini-2025-04-14`
- Provider reached: OpenAI

## Usage Limit

- Store slug: `javier`
- Plan: PRO
- Monthly limit: 20
- Old `sellerAiConversationCount`: 20
- New `sellerAiConversationCount` after unblock: 0
- Count after live QA conversation: 1
- DB changed: yes, only `Store.sellerAiConversationCount` for `javier`

## Smoke

- `https://www.exitosos.com`: PASS
- `https://www.exitosos.com/p/caesar-with-chicken`: PASS
- `https://jakawi.com/api/health`: PASS

## Chat Tests

1. `¿Qué me recomiendas?`
   - HTTP 200
   - Seller reply recommended real products: Caesar with Chicken and Tandoori Chicken.
   - Prices matched DB: Caesar with Chicken Bs. 25.00, Tandoori Chicken Bs. 21.00.

2. `Está caro, ¿por qué me conviene?`
   - HTTP 200
   - Handled price objection.
   - Mentioned Caesar with Chicken.
   - Offered WhatsApp handoff.
   - `objectionType`: price

3. `Quiero pedir por WhatsApp`
   - HTTP 200
   - Moved to `CLOSING_PREP`.
   - Asked for phone to continue.
   - WhatsApp handoff CTA active.

## Result

- Seller behavior: PASS
- Product grounding: PASS
- Price grounding: PASS
- WhatsApp handoff: PASS
- Fallback availability: preserved by existing rules path; not forced during this live run because OpenAI succeeded.
- Secrets exposed: no.

## Issues

- None blocking.
