# Seller AI Cost Router v1

Status: PASS

Objetivo:
Usar reglas para preguntas simples y OpenAI sólo para objeciones, comparación, indecisión y cierre complejo.

Rules-first:
- precio simple
- disponibilidad simple
- saludo
- producto actual
- WhatsApp directo simple

LLM:
- objeción de precio/confianza/entrega/pago
- comparación
- indecisión
- recomendación con criterio
- cierre complejo

Fallback:
Si OpenAI falla o está apagado, se usan reglas actuales.

## Deploy QA

QA_DIR: `/var/backups/jakawi.com/qa/seller-ai-cost-router-v1/20260710-205852`

Checks:
- Prisma validate: PASS
- Tests: PASS, 144 passed
- Typecheck: PASS
- Lint: PASS

Deploy:
- Docker build: PASS
- Stack deploy: PASS
- Service force update: PASS

Smoke:
- `https://www.exitosos.com`: PASS
- `https://www.exitosos.com/p/caesar-with-chicken`: PASS
- `https://jakawi.com/api/health`: PASS

Live chat:
- Simple question `¿Cuánto cuesta?`: PASS, HTTP 200, provider `rules`
- Objection `Está caro, ¿por qué me conviene?`: PASS, HTTP 200, provider `openai`, `objectionType=price`

Secrets exposed: no.
