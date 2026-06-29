import { storePlans, type StorePlanCode, type StorePlanConfig } from "@/config/plans";
import { getPrisma } from "@/lib/prisma";

export type PlanLimitErrorCode = "PRODUCT_LIMIT_REACHED" | "SELLER_AI_NOT_AVAILABLE" | "SELLER_AI_LIMIT_REACHED" | "TRIAL_EXPIRED";

export type PlanLimitErrorPayload = {
  code: PlanLimitErrorCode;
  message: string;
  limit: number | null;
  used: number;
  planCode: StorePlanCode;
};

type StorePlanLike = {
  id?: string;
  plan?: string | null;
  planStatus?: string | null;
  createdAt?: Date | null;
  trialEndsAt?: Date | null;
  sellerAiPeriodStart?: Date | null;
  sellerAiConversationCount?: number | null;
};

const monthMs = 30 * 24 * 60 * 60 * 1000;

export class PlanLimitError extends Error {
  payload: PlanLimitErrorPayload;

  constructor(payload: PlanLimitErrorPayload) {
    super(payload.message);
    this.name = "PlanLimitError";
    this.payload = payload;
  }
}

export function getNormalizedPlanCode(planCode: string | null | undefined): StorePlanCode {
  const normalized = planCode?.trim().toUpperCase();

  if (!normalized) return "TRIAL";
  if (normalized === "LAUNCH") return "TRIAL";
  if (normalized === "SELLER_AI") return "PRO";
  if (normalized === "SCALE") return "PREMIUM";
  if (normalized === "TRIAL" || normalized === "BASIC" || normalized === "PRO" || normalized === "PREMIUM") return normalized;

  return "TRIAL";
}

export function getPlanLimits(planCode: string | null | undefined): StorePlanConfig {
  return storePlans[getNormalizedPlanCode(planCode)];
}

export function getPlanLimitLabel(limit: number | null) {
  return limit == null || limit < 0 ? "Ilimitado" : String(limit);
}

function fallbackTrialEndsAt(store: StorePlanLike, planCode: StorePlanCode) {
  if (store.trialEndsAt) return store.trialEndsAt;
  const limits = getPlanLimits(planCode);
  if (planCode !== "TRIAL" || !store.createdAt) return null;
  const trialDays = limits.trialDays ?? 14;
  return new Date(store.createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

export function getStorePlanState(store: StorePlanLike) {
  const planCode = getNormalizedPlanCode(store.plan);
  const limits = getPlanLimits(planCode);
  const trialEndsAt = fallbackTrialEndsAt(store, planCode);
  const now = new Date();
  const trialExpired = planCode === "TRIAL" && Boolean(trialEndsAt && trialEndsAt <= now);
  const planStatus = trialExpired ? "EXPIRED" : store.planStatus || (planCode === "TRIAL" ? "TRIALING" : "ACTIVE");

  return {
    planCode,
    planName: limits.name,
    limits,
    planStatus,
    trialEndsAt,
    trialExpired,
    sellerAiEnabled: limits.sellerAiEnabled && !trialExpired,
    productCreationEnabled: !trialExpired,
  };
}

export async function getProductUsage(storeId: string) {
  const [store, used] = await Promise.all([
    getPrisma().store.findUnique({ where: { id: storeId } }),
    getPrisma().product.count({ where: { storeId } }),
  ]);
  if (!store) throw new Error("Store not found");

  const state = getStorePlanState(store);
  const limit = state.limits.productLimit;
  return {
    planCode: state.planCode,
    planName: state.planName,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    isNearLimit: used >= Math.ceil(limit * 0.8),
    isLimitReached: used >= limit,
    trialExpired: state.trialExpired,
    trialEndsAt: state.trialEndsAt,
  };
}

export async function assertCanCreateProduct(storeId: string) {
  const usage = await getProductUsage(storeId);
  if (usage.trialExpired) {
    throw new PlanLimitError({
      code: "TRIAL_EXPIRED",
      message: "Tu prueba gratuita terminó. Puedes elegir un plan para seguir agregando productos y usando JAKAWI.",
      limit: usage.limit,
      used: usage.used,
      planCode: usage.planCode,
    });
  }
  if (usage.isLimitReached) {
    throw new PlanLimitError({
      code: "PRODUCT_LIMIT_REACHED",
      message: `Llegaste al límite de productos de tu plan. Tu plan permite ${usage.limit} productos. Para agregar más, cambia de plan.`,
      limit: usage.limit,
      used: usage.used,
      planCode: usage.planCode,
    });
  }
  return usage;
}

function shouldResetSellerAiUsage(periodStart?: Date | null) {
  if (!periodStart) return false;
  return Date.now() - periodStart.getTime() >= monthMs;
}

export async function resetSellerAiMonthlyUsageIfNeeded(store: StorePlanLike & { id: string }) {
  if (!shouldResetSellerAiUsage(store.sellerAiPeriodStart)) return store;

  return getPrisma().store.update({
    where: { id: store.id },
    data: {
      sellerAiPeriodStart: new Date(),
      sellerAiConversationCount: 0,
    },
  });
}

export async function getSellerAiUsage(storeId: string) {
  const initialStore = await getPrisma().store.findUnique({ where: { id: storeId } });
  if (!initialStore) throw new Error("Store not found");

  const stateBeforeReset = getStorePlanState(initialStore);
  const store = stateBeforeReset.sellerAiEnabled ? await resetSellerAiMonthlyUsageIfNeeded(initialStore) : initialStore;
  const state = getStorePlanState(store);
  const limit = state.limits.sellerAiMonthlyConversations;
  const used = store.sellerAiConversationCount ?? 0;
  const isUnlimited = limit == null || limit < 0;

  return {
    planCode: state.planCode,
    planName: state.planName,
    enabled: state.sellerAiEnabled,
    used,
    limit,
    remaining: isUnlimited ? null : Math.max(0, limit - used),
    isUnlimited,
    isLimitReached: !isUnlimited && used >= limit,
    periodStart: store.sellerAiPeriodStart,
    trialExpired: state.trialExpired,
    trialEndsAt: state.trialEndsAt,
  };
}

export async function assertCanUseSellerAi(storeId: string) {
  const usage = await getSellerAiUsage(storeId);

  if (!usage.enabled) {
    throw new PlanLimitError({
      code: usage.trialExpired ? "TRIAL_EXPIRED" : "SELLER_AI_NOT_AVAILABLE",
      message: usage.trialExpired ? "Tu prueba gratuita terminó." : "Seller AI no está disponible en tu plan.",
      limit: usage.limit,
      used: usage.used,
      planCode: usage.planCode,
    });
  }

  if (usage.isLimitReached) {
    throw new PlanLimitError({
      code: "SELLER_AI_LIMIT_REACHED",
      message: "Tu tienda alcanzó el límite mensual de conversaciones Seller AI.",
      limit: usage.limit,
      used: usage.used,
      planCode: usage.planCode,
    });
  }

  return usage;
}

export async function incrementSellerAiConversationUsage(storeId: string, params: { journeyId: string }) {
  const journey = await getPrisma().customerJourney.findFirst({
    where: { id: params.journeyId, storeId },
    select: { id: true, sellerAiCountedAt: true },
  });
  if (!journey) throw new Error("Journey not found");

  if (journey.sellerAiCountedAt) {
    const usage = await getSellerAiUsage(storeId);
    if (!usage.enabled) {
      throw new PlanLimitError({
        code: usage.trialExpired ? "TRIAL_EXPIRED" : "SELLER_AI_NOT_AVAILABLE",
        message: usage.trialExpired ? "Tu prueba gratuita terminó." : "Seller AI no está disponible en tu plan.",
        limit: usage.limit,
        used: usage.used,
        planCode: usage.planCode,
      });
    }
    return { counted: false, usage };
  }

  const usage = await assertCanUseSellerAi(storeId);
  const now = new Date();
  const counted = await getPrisma().customerJourney.updateMany({
    where: { id: params.journeyId, storeId, sellerAiCountedAt: null },
    data: { sellerAiCountedAt: now },
  });

  if (counted.count === 0) {
    return { counted: false, usage: await getSellerAiUsage(storeId) };
  }

  const updatedStore = await getPrisma().store.update({
    where: { id: storeId },
    data: {
      sellerAiConversationCount: { increment: 1 },
      sellerAiPeriodStart: usage.periodStart ?? now,
    },
  });

  return {
    counted: true,
    usage: {
      ...usage,
      used: updatedStore.sellerAiConversationCount,
      remaining: usage.isUnlimited || usage.limit == null ? null : Math.max(0, usage.limit - updatedStore.sellerAiConversationCount),
      periodStart: updatedStore.sellerAiPeriodStart,
    },
  };
}

export function getProductLimit(planCode: string | null | undefined) {
  return getPlanLimits(planCode).productLimit;
}

export function canCreateMoreProducts(planCode: string | null | undefined, currentCount: number) {
  return currentCount < getProductLimit(planCode);
}
