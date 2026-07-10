# Seller AI Context, Prompt and Memory Audit

Status: WARN.

Scope: investigation only. No code changes, no deploy, no DB writes, no OpenAI calls.

## Current State

Seller AI is a hybrid system:

- Rules-first chat lives in `/api/seller-ai/chat`.
- OpenAI is available behind feature flags and a cost router.
- Simple questions stay on rules.
- Objections, comparison, indecision, and complex closing can use OpenAI.
- WhatsApp handoff remains the closing channel.
- Conversation, lead, journey, events, and snapshots are persisted.

The architecture is mostly aligned with the desired model, but prompt/style ownership and memory behavior are still minimal.

## Owner Inputs Current

The owner can configure store-level public and commercial data:

- Store name, slug, description, commercial tagline.
- WhatsApp, Instagram, TikTok.
- Country, currency, locale.
- Logo, cover, visual identity, commercial storefront template.
- Products: name, slug, price, category, description, image, visibility, featured status.
- Seller AI voice notes: display name, avatar, enable/disable, intro/guidance/handoff audio URLs, transcripts, durations.

There is no owner-editable LLM prompt, tone, personality, sales style, objection policy, or freeform AI instruction field.

There are commercial notes only indirectly through:

- store description/tagline,
- product description,
- voice-note transcripts,
- detected journey fields such as need, budget, urgency, objections.

These store description/tagline and voice-note transcripts are not currently sent to the LLM context.

## Product Context Current

For rules:

- `/api/seller-ai/chat` loads current product by `currentProductId` or `lead.currentProductId`.
- Product fields available to rules include id, name, description, price cents, currency, category id, category.
- Rules use mostly product name, price, category, and current user message.
- Recommendations are loaded only for alternative/comparison flows and capped to 3 for the rules UI.

For OpenAI:

- `llm-context.ts` builds a minimal context.
- Current product is included if present.
- Candidate products include current product plus related/fallback visible products from the same store.
- Product context sent to OpenAI includes id, slug, name, price label, short description, category name, URL.
- Max context products defaults to 4 and is clamped to 5.
- Recent messages default to 6 and each content is sliced to 1000 chars.
- Only visible products from the same store are queried.
- Full catalog is not sent.

Current product context is good enough for Exitosos and avoids catalog flooding.

## Prompt Current

The OpenAI system prompt is defined in `app/src/lib/seller-ai/providers/openai.ts`.

It is short, hard-coded, and not owner-editable. It tells the model:

- act as the seller of the store,
- use only provided context,
- do not invent products, prices, discounts, stock, shipping, warranties, or payment methods,
- handle objections with empathy,
- move toward WhatsApp when there is intent,
- answer briefly and naturally,
- do not mention internal implementation details.

The prompt is centralized for OpenAI, but sales behavior is still split across:

- `providers/openai.ts` system prompt,
- `chat/route.ts` rule replies,
- `seller-ai.ts` config templates,
- `modes.ts` signal/mode inference,
- `conversation-state.ts` quick replies,
- `templates.ts` older heuristic helpers.

The owner cannot modify the prompt. This is good for safety. There is no structured prompt preset layer yet.

## Sales Styles Current

There are no explicit owner-selectable sales presets like:

- consultivo,
- directo,
- premium/confianza,
- cierre rápido,
- experto.

There are internal modes:

- `DISCOVERY`
- `PRODUCT_ADVISOR`
- `DECISION_SUPPORT`
- `CLOSING_PREP`

There are commercial storefront types:

- `PRODUCT_STORE`
- `LIVE_CATALOG`
- `MENU`
- `SERVICES`
- `COURSES`

These are workflow/category modes, not sales style presets.

Recommendation: keep styles pre-defined by JAKAWI, not freeform owner prompts.

## Conversation History Current

Persistence:

- `Conversation` exists per lead.
- `ConversationMessage` stores USER and ASSISTANT messages.
- `/api/seller-ai/opening` writes opening assistant messages.
- `/api/seller-ai/chat` writes every user message and assistant reply.
- Message metadata stores journey/product/mode/provider/objection signals.

OpenAI memory:

- `/api/seller-ai/chat` builds `messagesBeforeReply`.
- OpenAI receives the last 6 USER/ASSISTANT messages by default.
- The LLM also receives current journey summary if present.

Rules memory:

- Rules primarily use current message, current product, current journey signals, inferred mode, lead/journey accumulated fields, and quick-reply history.
- Rules do not semantically parse full prior conversation.
- Quick replies avoid repetition using recent user messages.
- Intent scoring uses accumulated events/messages.

Journey memory:

- `CustomerJourney` stores stage, current product/category, detected need, budget, urgency, objections, viewed products, recommended products, conversation summary.
- `Lead` stores current product, selected product, budget, urgency, objections, conversation summary, WhatsApp message.
- `CommercialSnapshot` stores handoff context for WhatsApp.

Conversation summary:

- Exists in schema and handoff flow.
- It is generated during WhatsApp continuation via `generateLeadSummary`.
- It is not proactively summarized after each chat turn.

Reference understanding:

- OpenAI can likely understand short references like "ese producto", "el otro", or "lo que me dijiste antes" when they fall within the last 6 messages and product candidates.
- Rules have weak reference understanding. They can use current product and some accumulated signals, but not robustly resolve "el otro" unless the current product/recommendations happen to line up.

Separation:

- Leads and journeys are scoped by store id.
- Journey reuse uses store id plus session id / visitor id / explicit journey id.
- Lead reuse uses store id plus journey/session/visitor.
- This reduces cross-store mixing risk.

## Cost Router Current

The cost router is in `app/src/lib/seller-ai/llm.ts`.

Rules path:

- simple price,
- simple availability,
- simple product questions,
- direct questions with enough product context.

OpenAI path:

- real objections,
- comparisons/alternatives,
- indecision,
- complex closing,
- longer closing-prep messages.

The router currently looks at:

- current visitor message,
- inferred mode,
- commercial signals only lightly.

It does not use conversation history to decide whether a simple-looking message is actually contextual, for example "¿y el otro?" after prior recommendations.

## Risks

Owner prompt risk:

- Low today, because owner cannot write arbitrary LLM prompts.
- Future risk if freeform instructions are added without guardrails.

Context size risk:

- Low today. OpenAI gets capped products and capped recent messages.
- Store description/tagline are not sent, so some useful commercial context is missing.

Memory risk:

- Medium. OpenAI has short memory, but rules have limited semantic memory.
- Conversation summary exists but is not maintained continuously.
- References like "el otro" may work only in OpenAI path and only if recent context includes the relevant product.

Hallucination risk:

- Medium-low. Prompt prohibits inventing, output slugs are validated, and candidate products are same-store visible products.
- The model can still produce soft claims like "ingredientes frescos" if not explicitly present in product/store context.
- Shipping, stock, warranty, discounts are protected by prompt and rules usually defer to WhatsApp.

Store/product mixing risk:

- Low. Queries filter by `storeId` and visible products.
- Candidate slugs are validated against candidate products.

Prompt drift risk:

- Medium. Behavior is distributed across config templates, rules, quick replies, cost router, and OpenAI prompt.

Cost-router risk:

- Medium. Router is message-pattern based. It does not yet consider prior turn context deeply.

## Recommendation Exact

Minimal implementation path:

1. Keep JAKAWI in control of all prompts.
2. Add one store-level `sellerAiSalesStyle` enum, not a freeform prompt.
3. Define 4-5 JAKAWI-owned style presets:
   - `CONSULTATIVE`: asks one useful question, explains fit.
   - `DIRECT`: short answer, moves to decision.
   - `TRUST_PREMIUM`: emphasizes confidence using only known data.
   - `FAST_CLOSE`: stronger WhatsApp handoff when intent is clear.
   - `EXPERT`: gives more comparison criteria using only known product data.
4. Add optional owner-controlled "commercial notes" as structured fields, not prompt text:
   - `salesHighlights`
   - `shippingPolicyNote`
   - `paymentPolicyNote`
   - `warrantyPolicyNote`
   - `availabilityPolicyNote`
5. Send only these notes to OpenAI when present and cap each field.
6. Include store description/tagline in LLM context, capped.
7. Keep current product and max 4 candidate products.
8. Keep recent messages at 6.
9. Add a small rolling `conversationSummary` update only after OpenAI calls or handoff, not every simple rule turn.
10. Improve cost router with a small history-aware check:
    - if current message is short and ambiguous ("ese", "el otro", "lo que dijiste", "cuál de esos"), use OpenAI only when recent messages include recommendations/comparison.
11. Do not expose freeform prompt editing to owners.

## Next Minimum Step

Implement `SellerAiSalesStyle` as a store-level enum-like string with defaults and no migration if using an existing nullable string is acceptable; otherwise make a tiny migration later.

Good-enough v1 without migration:

- Add a typed config map in `seller-ai.ts` for style presets.
- Hard-code default style as `CONSULTATIVE`.
- Add style to LLM input from config only.
- Add capped `store.description` and `store.commercialTagline` to LLM input.
- Add history-aware cost-router patterns for ambiguous references.
- Add tests for:
  - simple question remains rules,
  - ambiguous "el otro" after recommendation uses OpenAI,
  - store description/tagline are capped,
  - style preset is included but owner prompt is not.

This reaches the target model without owner prompt risk, catalog flooding, or architecture changes.

