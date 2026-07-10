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

