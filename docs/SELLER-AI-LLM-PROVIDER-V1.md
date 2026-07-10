# Seller AI LLM Provider v1

Status: PASS local / WARN activation pending.

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-llm-provider-v1/20260710-190435`

## Summary

- Reuses the existing `SellerAiWidget`.
- Reuses `/api/seller-ai/chat`; no new chat endpoint.
- Adds OpenAI as the first LLM provider behind `SELLER_AI_LLM_ENABLED`.
- Default flag is safe: `SELLER_AI_LLM_ENABLED=false`.
- Pilot store: `javier` / Exitosos.
- Context sent to the model is capped to 4 products and 6 recent messages by default.
- Candidate products are restricted to visible products from the same store.
- Invalid provider output or provider failure falls back to current rules.
- WhatsApp handoff remains the existing `/api/seller-ai/continue-whatsapp` flow.
- Secrets exposed: no.

## Provider

Provider: OpenAI Responses API with structured JSON output.

The system prompt instructs the assistant to use only provided store/product context and not invent products, prices, discounts, stock, shipping, warranties, or payment methods.

## Tests

Completed QA:

- Prisma validate: PASS
- Prisma generate: PASS
- Unit tests: PASS, 144 passed
- Typecheck: PASS
- Lint: PASS

## Deploy

Deploy: no.

Reason: `OPENAI_API_KEY` is absent in `.env.stack`, so activation remains pending.

## Smoke

Smoke result: not run because deploy was skipped.

## Next Steps

- Seller AI Live QA Exitosos.
- n8n follow-up later.
