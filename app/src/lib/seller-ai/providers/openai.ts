import { getSellerAiLlmConfig } from "@/config/seller-ai";
import { sellerAiReplyJsonSchema, validateSellerAiReplyOutput, type SellerAiLlmReplyResult, type SellerAiReplyInput } from "@/lib/seller-ai/types";

type OpenAIResponseLike = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

type OpenAIProviderOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

function systemPrompt(storeName: string) {
  return `Eres el vendedor de la tienda ${storeName}.
Ayudas a visitantes a elegir productos reales de esta tienda.
Usa solo el contexto entregado.
No inventes productos, precios, descuentos, stock, envios, garantias ni metodos de pago.
Maneja objeciones con empatia y datos disponibles.
Tu objetivo es avanzar al cierre por WhatsApp cuando el cliente muestre intencion.
Responde breve, natural y vendedor.
No menciones JAKAWI, Cloudflare, Prisma, tokens, admin ni configuracion interna.`;
}

function extractOutputText(response: OpenAIResponseLike) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return null;
}

export async function getOpenAISellerReply(input: SellerAiReplyInput, options: OpenAIProviderOptions = {}): Promise<SellerAiLlmReplyResult | null> {
  const env = options.env ?? process.env;
  const config = getSellerAiLlmConfig(env);
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!config.enabled || config.provider !== "openai" || !apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        temperature: 0.4,
        max_output_tokens: 450,
        input: [
          { role: "system", content: systemPrompt(input.store.name) },
          {
            role: "user",
            content: JSON.stringify({
              task: "Responde como vendedor usando solo este contexto. Si no tienes datos suficientes, dilo y lleva al WhatsApp.",
              context: input,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "seller_ai_reply",
            strict: true,
            schema: sellerAiReplyJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OpenAIResponseLike;
    const rawText = extractOutputText(data);
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as unknown;
    const output = validateSellerAiReplyOutput(parsed, input.candidateProducts);
    if (!output) return null;

    return {
      output,
      modelUsed: data.model ?? config.model,
      tokensInput: data.usage?.input_tokens,
      tokensOutput: data.usage?.output_tokens,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
