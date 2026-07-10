import assert from "node:assert/strict";
import test from "node:test";
import { MessageRole } from "@prisma/client";
import { getSellerAiLlmConfig, isSellerAiLlmStoreAllowed } from "@/config/seller-ai";
import { hasAmbiguousReference, recentHistoryHasProductComparisonOrRecommendations, shouldUseSellerAiLlm } from "@/lib/seller-ai/llm";
import { buildSellerAiReplyInput, getSellerAiLlmCandidateProducts, pickRecentSellerAiMessages } from "@/lib/seller-ai/llm-context";
import { getOpenAISellerReply } from "@/lib/seller-ai/providers/openai";
import { validateSellerAiReplyOutput, type SellerAiReplyInput } from "@/lib/seller-ai/types";

const envBase = {
  SELLER_AI_LLM_PROVIDER: "openai",
  SELLER_AI_LLM_MODEL: "gpt-test-model",
  SELLER_AI_LLM_STORE_SLUGS: "javier",
  SELLER_AI_LLM_TIMEOUT_MS: "10000",
  SELLER_AI_LLM_MAX_RECENT_MESSAGES: "6",
  SELLER_AI_LLM_MAX_CONTEXT_PRODUCTS: "4",
};

const store = {
  id: "store-1",
  slug: "javier",
  name: "Exitosos",
  description: "Tienda de comida saludable con platos frescos para almuerzo.",
  commercialTagline: "Comida practica para pedir rapido.",
  whatsapp: "59170000000",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
  plan: "LAUNCH",
};

const currentProduct = {
  id: "product-1",
  storeId: "store-1",
  categoryId: "cat-1",
  name: "Caesar With Chicken",
  slug: "caesar-with-chicken",
  description: "Ensalada caesar con pollo.",
  priceCents: 4500,
  currency: "BOB",
  imageUrl: null,
  isVisible: true,
  isFeatured: true,
  featuredAt: null,
  sortOrder: 0,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  category: { name: "Ensaladas", slug: "ensaladas" },
};

const products = [
  currentProduct,
  { ...currentProduct, id: "product-2", slug: "wrap-pollo", name: "Wrap de Pollo", isFeatured: false },
  { ...currentProduct, id: "product-3", slug: "ensalada-mixta", name: "Ensalada Mixta", isFeatured: false },
  { ...currentProduct, id: "product-4", slug: "jugo-natural", name: "Jugo Natural", categoryId: "cat-2", category: { name: "Bebidas", slug: "bebidas" } },
  { ...currentProduct, id: "product-5", slug: "otra-tienda", name: "Otra tienda", storeId: "store-2" },
  { ...currentProduct, id: "product-6", slug: "oculto", name: "Producto oculto", isVisible: false },
];

function createDb() {
  return {
    product: {
      findMany: async (args: { where: { storeId?: string; isVisible?: boolean; categoryId?: string; id?: { not?: string; notIn?: string[] } }; take?: number }) => {
        const rows = products.filter((product) => {
          if (args.where.storeId && product.storeId !== args.where.storeId) return false;
          if (args.where.isVisible !== undefined && product.isVisible !== args.where.isVisible) return false;
          if (args.where.categoryId && product.categoryId !== args.where.categoryId) return false;
          if (args.where.id?.not && product.id === args.where.id.not) return false;
          if (args.where.id?.notIn?.includes(product.id)) return false;
          return true;
        });
        return rows.slice(0, args.take ?? rows.length);
      },
    },
  };
}

function replyInput(): SellerAiReplyInput {
  return {
    store: { id: "store-1", slug: "javier", name: "Exitosos", whatsappPresent: true },
    storeContext: {
      name: "Exitosos",
      description: "Tienda de comida saludable.",
      commercialTagline: "Comida practica.",
    },
    salesStyle: {
      id: "CONSULTATIVE",
      instruction: "Haz una recomendacion consultiva y breve. Pregunta maximo una cosa util. Usa solo datos provistos.",
    },
    currentProduct: {
      id: "product-1",
      slug: "caesar-with-chicken",
      name: "Caesar With Chicken",
      priceLabel: "Bs 45",
      shortDescription: "Ensalada caesar con pollo.",
      categoryName: "Ensaladas",
      url: "/javier/p/caesar-with-chicken",
    },
    candidateProducts: [
      {
        id: "product-1",
        slug: "caesar-with-chicken",
        name: "Caesar With Chicken",
        priceLabel: "Bs 45",
        shortDescription: "Ensalada caesar con pollo.",
        categoryName: "Ensaladas",
        url: "/javier/p/caesar-with-chicken",
      },
    ],
    commercialSignals: { objections: ["precio"], intentBoost: 12, hasStrongIntent: false },
    mode: "DECISION_SUPPORT",
    journeySummary: null,
    recentMessages: [],
    visitorMessage: "Cuanto cuesta?",
    whatsappHandoffAvailable: true,
    requirePhoneBeforeWhatsapp: false,
  };
}

test("LLM config defaults to disabled and parses safe values", () => {
  const config = getSellerAiLlmConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.provider, "openai");
  assert.equal(config.maxRecentMessages, 6);
  assert.equal(config.maxContextProducts, 4);
});

test("store not allowed gates LLM fallback", () => {
  assert.equal(isSellerAiLlmStoreAllowed("javier", { SELLER_AI_LLM_STORE_SLUGS: "javier,otra" }), true);
  assert.equal(isSellerAiLlmStoreAllowed("demo", { SELLER_AI_LLM_STORE_SLUGS: "javier,otra" }), false);
});

test("simple product questions stay on rules path", () => {
  assert.equal(
    shouldUseSellerAiLlm({
      visitorMessage: "¿Cuánto cuesta?",
      commercialSignals: { objections: ["precio"], intentBoost: 12, hasStrongIntent: false },
      mode: "DECISION_SUPPORT",
    }),
    false,
  );
  assert.equal(
    shouldUseSellerAiLlm({
      visitorMessage: "¿Está disponible?",
      commercialSignals: { objections: ["disponibilidad"], intentBoost: 12, hasStrongIntent: false },
      mode: "DECISION_SUPPORT",
    }),
    false,
  );
});

test("objections, comparisons, indecision, and complex closing use OpenAI", () => {
  const baseSignals = { objections: [], intentBoost: 0, hasStrongIntent: false };
  assert.equal(shouldUseSellerAiLlm({ visitorMessage: "Está caro, ¿por qué me conviene?", commercialSignals: { ...baseSignals, objections: ["precio"] }, mode: "DECISION_SUPPORT" }), true);
  assert.equal(shouldUseSellerAiLlm({ visitorMessage: "Compárame este con otra opción más económica", commercialSignals: baseSignals, mode: "PRODUCT_ADVISOR" }), true);
  assert.equal(shouldUseSellerAiLlm({ visitorMessage: "No sé si me conviene, ayúdame a decidir", commercialSignals: baseSignals, mode: "PRODUCT_ADVISOR" }), true);
  assert.equal(
    shouldUseSellerAiLlm({
      visitorMessage: "Quiero pedir por WhatsApp",
      commercialSignals: { ...baseSignals, hasStrongIntent: true },
      mode: "CLOSING_PREP",
    }),
    true,
  );
});

test("ambiguous reference after recommendation history uses OpenAI", () => {
  const recentMessages = [
    {
      role: MessageRole.ASSISTANT,
      content: "Para comparar sin marearte, miraria Caesar With Chicken y Wrap de Pollo como buenas opciones.",
    },
  ];

  assert.equal(hasAmbiguousReference("¿Y el otro?"), true);
  assert.equal(recentHistoryHasProductComparisonOrRecommendations(recentMessages), true);
  assert.equal(
    shouldUseSellerAiLlm({
      visitorMessage: "¿Y el otro?",
      commercialSignals: { objections: [], intentBoost: 0, hasStrongIntent: false },
      mode: "PRODUCT_ADVISOR",
      recentMessages,
    }),
    true,
  );
});

test("ambiguous reference without useful history stays on rules path", () => {
  assert.equal(hasAmbiguousReference("¿Y ese?"), true);
  assert.equal(
    shouldUseSellerAiLlm({
      visitorMessage: "¿Y ese?",
      commercialSignals: { objections: [], intentBoost: 0, hasStrongIntent: false },
      mode: "PRODUCT_ADVISOR",
      recentMessages: [],
    }),
    false,
  );
});

test("flag off uses rules path and does not call OpenAI", async () => {
  let called = false;
  const result = await getOpenAISellerReply(replyInput(), {
    env: { ...envBase, SELLER_AI_LLM_ENABLED: "false", OPENAI_API_KEY: "sk-test" },
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch,
  });

  assert.equal(result, null);
  assert.equal(called, false);
});

test("missing OPENAI_API_KEY falls back before fetch", async () => {
  let called = false;
  const result = await getOpenAISellerReply(replyInput(), {
    env: { ...envBase, SELLER_AI_LLM_ENABLED: "true" },
    fetchImpl: (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch,
  });

  assert.equal(result, null);
  assert.equal(called, false);
});

test("provider uses model from env and maps valid structured output", async () => {
  const requestBodies: Array<{ model?: string; input?: Array<{ content?: string }> }> = [];
  const result = await getOpenAISellerReply(replyInput(), {
    env: { ...envBase, SELLER_AI_LLM_ENABLED: "true", OPENAI_API_KEY: "sk-test" },
    fetchImpl: (async (_url, init) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          model: "gpt-test-model",
          output_text: JSON.stringify({
            reply: "La Caesar With Chicken cuesta Bs 45. Si te interesa, avanzamos por WhatsApp.",
            quickReplies: ["Me interesa", "Continuar por WhatsApp"],
            recommendedProductSlugs: ["caesar-with-chicken"],
            objectionType: "price",
            handoffReady: true,
            shouldAskPhone: false,
            whatsappCtaLabel: "Continuar por WhatsApp",
            fallbackToRules: false,
          }),
          usage: { input_tokens: 100, output_tokens: 40 },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });

  assert.equal(requestBodies[0]?.model, "gpt-test-model");
  assert.match(JSON.stringify(requestBodies[0]), /storeContext/);
  assert.match(JSON.stringify(requestBodies[0]), /salesStyle/);
  assert.equal(result?.output.objectionType, "price");
  assert.equal(result?.output.handoffReady, true);
  assert.equal(result?.tokensInput, 100);
});

test("invalid provider output falls back to rules", async () => {
  const result = await getOpenAISellerReply(replyInput(), {
    env: { ...envBase, SELLER_AI_LLM_ENABLED: "true", OPENAI_API_KEY: "sk-test" },
    fetchImpl: (async () => new Response(JSON.stringify({ output_text: JSON.stringify({ reply: "sin contrato" }) }), { status: 200 })) as typeof fetch,
  });

  assert.equal(result, null);
});

test("unknown recommended product slugs are discarded", () => {
  const output = validateSellerAiReplyOutput(
    {
      reply: "Te recomiendo la Caesar With Chicken.",
      quickReplies: ["Ver precio"],
      recommendedProductSlugs: ["caesar-with-chicken", "inventado"],
      objectionType: null,
      handoffReady: false,
      shouldAskPhone: false,
      whatsappCtaLabel: null,
      fallbackToRules: false,
    },
    [{ slug: "caesar-with-chicken" }],
  );

  assert.deepEqual(output?.recommendedProductSlugs, ["caesar-with-chicken"]);
});

test("OpenAI errors do not log API key or Authorization", async () => {
  const logs: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));
  console.warn = (...args: unknown[]) => logs.push(args.join(" "));
  try {
    const result = await getOpenAISellerReply(replyInput(), {
      env: { ...envBase, SELLER_AI_LLM_ENABLED: "true", OPENAI_API_KEY: "sk-secret-value" },
      fetchImpl: (async () => {
        throw new Error("network failed");
      }) as typeof fetch,
    });
    assert.equal(result, null);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }

  assert.equal(logs.join("\n").includes("sk-secret-value"), false);
  assert.equal(/authorization/i.test(logs.join("\n")), false);
});

test("context includes current product and caps products to four", async () => {
  const candidates = await getSellerAiLlmCandidateProducts({ store, currentProduct, maxContextProducts: 4, db: createDb() as never });

  assert.equal(candidates[0].slug, "caesar-with-chicken");
  assert.equal(candidates.length, 4);
});

test("context excludes other stores and unpublished products", async () => {
  const candidates = await getSellerAiLlmCandidateProducts({ store, currentProduct, maxContextProducts: 5, db: createDb() as never });
  const slugs = candidates.map((product) => product.slug);

  assert.equal(slugs.includes("otra-tienda"), false);
  assert.equal(slugs.includes("oculto"), false);
});

test("recent messages are limited to six", () => {
  const messages = Array.from({ length: 8 }, (_, index) => ({
    id: `message-${index}`,
    conversationId: "conversation-1",
    role: index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
    content: `mensaje ${index}`,
    metadata: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
  }));

  const recent = pickRecentSellerAiMessages(messages, 6);

  assert.equal(recent.length, 6);
  assert.equal(recent[0].content, "mensaje 2");
});

test("reply input carries current product and WhatsApp handoff flags", async () => {
  const input = await buildSellerAiReplyInput({
    store,
    currentProduct,
    commercialSignals: { objections: ["precio"], intentBoost: 12, hasStrongIntent: false },
    mode: "DECISION_SUPPORT",
    journeySummary: "Cliente pregunta por precio.",
    recentMessages: [],
    visitorMessage: "Que me recomiendas y cuanto cuesta?",
    db: createDb() as never,
  });

  assert.equal(input.currentProduct?.slug, "caesar-with-chicken");
  assert.equal(input.candidateProducts.length, 4);
  assert.equal(input.whatsappHandoffAvailable, true);
  assert.equal(input.store.whatsappPresent, true);
});

test("reply input includes capped store context and default sales style", async () => {
  const input = await buildSellerAiReplyInput({
    store: {
      ...store,
      description: "a".repeat(650),
      commercialTagline: "b".repeat(260),
    },
    currentProduct,
    commercialSignals: { objections: [], intentBoost: 0, hasStrongIntent: false },
    mode: "PRODUCT_ADVISOR",
    journeySummary: null,
    recentMessages: [],
    visitorMessage: "Que me recomiendas?",
    db: createDb() as never,
  });

  assert.equal(input.storeContext.name, "Exitosos");
  assert.equal(input.storeContext.description?.length, 500);
  assert.equal(input.storeContext.commercialTagline?.length, 200);
  assert.equal(input.salesStyle.id, "CONSULTATIVE");
  assert.match(input.salesStyle.instruction, /datos provistos/i);
});

test("reply input does not carry owner prompt fields", async () => {
  const input = await buildSellerAiReplyInput({
    store,
    currentProduct,
    commercialSignals: { objections: [], intentBoost: 0, hasStrongIntent: false },
    mode: "PRODUCT_ADVISOR",
    journeySummary: null,
    recentMessages: [],
    visitorMessage: "Que me recomiendas?",
    db: createDb() as never,
  });

  assert.deepEqual(Object.keys(input.storeContext).sort(), ["commercialTagline", "description", "name"]);
  assert.equal(JSON.stringify(input).includes("ownerPrompt"), false);
  assert.equal(JSON.stringify(input).includes("freeform"), false);
});
