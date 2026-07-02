import { calculateSuggestedCommission } from "@/lib/partner-commissions";
import { commercialRealStorePaymentWhere, getDataQualityForStorePayment, isCommercialRealDataQuality } from "@/lib/data-quality";
import { getPrisma } from "@/lib/prisma";
import { formatStorePaymentMoney } from "@/lib/store-payments";

export type SuggestedGrowthActionStatus = "SUGGESTED" | "COVERED" | "NOT_APPLICABLE" | "NEEDS_REVIEW";

export type SuggestedGrowthActionKind = "PARTNER_COMMISSION" | "STORE_REWARD" | "NONE";

export type SuggestedGrowthAction = {
  kind: SuggestedGrowthActionKind;
  status: SuggestedGrowthActionStatus;
  label: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  partnerName?: string;
  referrerStoreName?: string;
  storeName: string;
  paymentAmount: string;
  paymentAmountCents: number;
  paymentCurrency: string;
  paymentId: string;
  attributionId?: string;
  partnerId?: string;
  referrerStoreId?: string;
  storeId: string;
};

export type SuggestedGrowthActionsSummary = {
  commissionSuggested: number;
  rewardSuggested: number;
  covered: number;
  noAction: number;
  needsReview: number;
  pendingActions: number;
  partnerPending: Map<string, SuggestedGrowthAction>;
  referrerStorePending: Map<string, SuggestedGrowthAction>;
};

type PaymentForSuggestion = {
  id: string;
  storeId: string;
  amountCents: number;
  currency: string;
  status: string;
  externalReference: string | null;
  description: string | null;
  notes: string | null;
  store: {
    name: string;
    slug?: string | null;
    owner?: {
      email: string;
      role?: string | null;
    } | null;
    acquisitionAttribution: {
      id: string;
      sourceType: string;
      partnerId: string | null;
      referrerStoreId: string | null;
      partner: {
        id: string;
        name: string;
        commissionRateBps: number | null;
      } | null;
      referrerStore: {
        id: string;
        name: string;
      } | null;
    } | null;
  };
};

function centsToInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return null;
  return (cents / 100).toFixed(2);
}

function setQueryParam(search: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  search.set(key, String(value));
}

export function buildCommissionPrefillUrl(params: {
  partnerId: string;
  storeId: string;
  attributionId?: string | null;
  basisAmountCents?: number | null;
  commissionAmountCents?: number | null;
  description?: string | null;
  notes?: string | null;
}) {
  const search = new URLSearchParams();
  setQueryParam(search, "partnerId", params.partnerId);
  setQueryParam(search, "storeId", params.storeId);
  setQueryParam(search, "attributionId", params.attributionId);
  setQueryParam(search, "basisAmount", centsToInput(params.basisAmountCents));
  setQueryParam(search, "commissionAmount", centsToInput(params.commissionAmountCents));
  setQueryParam(search, "description", params.description);
  setQueryParam(search, "notes", params.notes);
  return `/app/admin/commissions?${search.toString()}`;
}

export function buildRewardPrefillUrl(params: {
  referrerStoreId: string;
  referredStoreId: string;
  attributionId?: string | null;
  rewardType?: string | null;
  valueLabel?: string | null;
  description?: string | null;
  notes?: string | null;
}) {
  const search = new URLSearchParams();
  setQueryParam(search, "referrerStoreId", params.referrerStoreId);
  setQueryParam(search, "referredStoreId", params.referredStoreId);
  setQueryParam(search, "attributionId", params.attributionId);
  setQueryParam(search, "rewardType", params.rewardType ?? "FREE_MONTH");
  setQueryParam(search, "valueLabel", params.valueLabel);
  setQueryParam(search, "description", params.description);
  setQueryParam(search, "notes", params.notes);
  return `/app/admin/rewards?${search.toString()}`;
}

function actionBase(payment: PaymentForSuggestion) {
  return {
    storeName: payment.store.name,
    paymentAmount: formatStorePaymentMoney(payment.amountCents, payment.currency),
    paymentAmountCents: payment.amountCents,
    paymentCurrency: payment.currency,
    paymentId: payment.id,
    storeId: payment.storeId,
  };
}

function emptyAction(payment: PaymentForSuggestion, label: string, description: string): SuggestedGrowthAction {
  return {
    ...actionBase(payment),
    kind: "NONE",
    status: "NOT_APPLICABLE",
    label,
    description,
  };
}

function hasCoveredCommission(params: {
  commissions: { partnerId: string; storeId: string | null; attributionId: string | null }[];
  partnerId: string;
  storeId: string;
  attributionId: string;
}) {
  return params.commissions.some((commission) => {
    if (commission.partnerId !== params.partnerId || commission.storeId !== params.storeId) return false;
    return commission.attributionId === params.attributionId || commission.attributionId === null;
  });
}

function hasCoveredReward(params: {
  rewards: { referrerStoreId: string; referredStoreId: string | null; attributionId: string | null }[];
  referrerStoreId: string;
  referredStoreId: string;
  attributionId: string;
}) {
  return params.rewards.some((reward) => {
    if (reward.referrerStoreId !== params.referrerStoreId || reward.referredStoreId !== params.referredStoreId) return false;
    return reward.attributionId === params.attributionId || reward.attributionId === null;
  });
}

function buildActionForPayment(
  payment: PaymentForSuggestion,
  context: {
    commissions: { partnerId: string; storeId: string | null; attributionId: string | null }[];
    rewards: { referrerStoreId: string; referredStoreId: string | null; attributionId: string | null }[];
  },
): SuggestedGrowthAction {
  if (!isCommercialRealDataQuality(getDataQualityForStorePayment(payment))) {
    return emptyAction(payment, "Excluido de métricas reales", "Dato demo, QA o interno. No genera sugerencia comercial.");
  }

  if (payment.status !== "CONFIRMED" || payment.amountCents <= 0) {
    return emptyAction(payment, "Esperando pago confirmado", "La sugerencia se habilita cuando el pago está confirmado y tiene monto positivo.");
  }

  const attribution = payment.store.acquisitionAttribution;
  if (!attribution || attribution.sourceType === "ORGANIC") {
    return emptyAction(payment, "Sin acción comercial", "Pago orgánico o sin atribución comercial.");
  }

  if (attribution.sourceType === "PARTNER") {
    if (!attribution.partnerId || !attribution.partner) {
      return {
        ...actionBase(payment),
        kind: "PARTNER_COMMISSION",
        status: "NEEDS_REVIEW",
        label: "Revisar atribución partner",
        description: "El pago confirmado tiene sourceType PARTNER, pero falta el partner relacionado.",
        attributionId: attribution.id,
        storeId: payment.storeId,
      };
    }

    const covered = hasCoveredCommission({
      commissions: context.commissions,
      partnerId: attribution.partnerId,
      storeId: payment.storeId,
      attributionId: attribution.id,
    });

    if (covered) {
      return {
        ...actionBase(payment),
        kind: "PARTNER_COMMISSION",
        status: "COVERED",
        label: "Comisión cubierta",
        description: "Ya existe una comisión relacionada para esta tienda/atribución.",
        ctaLabel: "Ver comisiones",
        ctaHref: `/app/admin/commissions?partnerId=${encodeURIComponent(attribution.partnerId)}&storeId=${encodeURIComponent(payment.storeId)}&attributionId=${encodeURIComponent(attribution.id)}`,
        partnerName: attribution.partner.name,
        partnerId: attribution.partnerId,
        attributionId: attribution.id,
      };
    }

    const suggestedCommissionCents = calculateSuggestedCommission({
      amountCents: payment.amountCents,
      rateBps: attribution.partner.commissionRateBps,
    });

    return {
      ...actionBase(payment),
      kind: "PARTNER_COMMISSION",
      status: "SUGGESTED",
      label: "Comisión sugerida",
      description: `Esta tienda fue atribuida a ${attribution.partner.name}. Puedes crear una comisión manual.`,
      ctaLabel: "Crear comisión manual",
      ctaHref: buildCommissionPrefillUrl({
        partnerId: attribution.partnerId,
        storeId: payment.storeId,
        attributionId: attribution.id,
        basisAmountCents: payment.amountCents,
        commissionAmountCents: suggestedCommissionCents,
        description: "Comisión sugerida por pago confirmado",
        notes: `Pago confirmado: ${payment.id}`,
      }),
      partnerName: attribution.partner.name,
      partnerId: attribution.partnerId,
      attributionId: attribution.id,
    };
  }

  if (attribution.sourceType === "STORE_REFERRAL") {
    if (!attribution.referrerStoreId || !attribution.referrerStore) {
      return {
        ...actionBase(payment),
        kind: "STORE_REWARD",
        status: "NEEDS_REVIEW",
        label: "Revisar atribución de tienda",
        description: "El pago confirmado tiene sourceType STORE_REFERRAL, pero falta la tienda referidora.",
        attributionId: attribution.id,
      };
    }

    const covered = hasCoveredReward({
      rewards: context.rewards,
      referrerStoreId: attribution.referrerStoreId,
      referredStoreId: payment.storeId,
      attributionId: attribution.id,
    });

    if (covered) {
      return {
        ...actionBase(payment),
        kind: "STORE_REWARD",
        status: "COVERED",
        label: "Recompensa cubierta",
        description: "Ya existe una recompensa relacionada para esta tienda/atribución.",
        ctaLabel: "Ver recompensas",
        ctaHref: `/app/admin/rewards?referrerStoreId=${encodeURIComponent(attribution.referrerStoreId)}&referredStoreId=${encodeURIComponent(payment.storeId)}&attributionId=${encodeURIComponent(attribution.id)}`,
        referrerStoreName: attribution.referrerStore.name,
        referrerStoreId: attribution.referrerStoreId,
        attributionId: attribution.id,
      };
    }

    return {
      ...actionBase(payment),
      kind: "STORE_REWARD",
      status: "SUGGESTED",
      label: "Recompensa sugerida",
      description: `Esta tienda fue referida por ${attribution.referrerStore.name}. Puedes crear un beneficio manual.`,
      ctaLabel: "Crear recompensa manual",
      ctaHref: buildRewardPrefillUrl({
        referrerStoreId: attribution.referrerStoreId,
        referredStoreId: payment.storeId,
        attributionId: attribution.id,
        rewardType: "FREE_MONTH",
        valueLabel: "Beneficio sugerido por pago confirmado",
        description: "Recompensa sugerida por pago confirmado",
        notes: `Pago confirmado: ${payment.id}`,
      }),
      referrerStoreName: attribution.referrerStore.name,
      referrerStoreId: attribution.referrerStoreId,
      attributionId: attribution.id,
    };
  }

  return emptyAction(payment, "Sin acción comercial", "Pago orgánico o sin atribución comercial.");
}

async function buildSuggestedActions(payments: PaymentForSuggestion[]) {
  const partnerIds = [...new Set(payments.flatMap((payment) => payment.store.acquisitionAttribution?.partnerId ?? []))];
  const storeIds = [...new Set(payments.map((payment) => payment.storeId))];
  const referrerStoreIds = [...new Set(payments.flatMap((payment) => payment.store.acquisitionAttribution?.referrerStoreId ?? []))];

  const [commissions, rewards] = await Promise.all([
    partnerIds.length === 0
      ? Promise.resolve([])
      : getPrisma().partnerCommission.findMany({
          where: {
            partnerId: { in: partnerIds },
            storeId: { in: storeIds },
            status: { notIn: ["CANCELLED", "REVERSED"] },
          },
          select: { partnerId: true, storeId: true, attributionId: true },
        }),
    referrerStoreIds.length === 0
      ? Promise.resolve([])
      : getPrisma().storeReferralReward.findMany({
          where: {
            referrerStoreId: { in: referrerStoreIds },
            referredStoreId: { in: storeIds },
            status: { notIn: ["CANCELLED", "EXPIRED"] },
          },
          select: { referrerStoreId: true, referredStoreId: true, attributionId: true },
        }),
  ]);

  return new Map(payments.map((payment) => [payment.id, buildActionForPayment(payment, { commissions, rewards })]));
}

async function getPaymentsByIds(paymentIds: string[]) {
  const ids = [...new Set(paymentIds.filter(Boolean))];
  if (ids.length === 0) return [];

  return getPrisma().storePayment.findMany({
    where: { id: { in: ids } },
    include: {
      store: {
        select: {
          name: true,
          slug: true,
          owner: { select: { email: true, role: true } },
          acquisitionAttribution: {
            select: {
              id: true,
              sourceType: true,
              partnerId: true,
              referrerStoreId: true,
              partner: { select: { id: true, name: true, commissionRateBps: true } },
              referrerStore: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export async function getSuggestedActionsForPayments(paymentIds: string[]) {
  return buildSuggestedActions(await getPaymentsByIds(paymentIds));
}

export async function getPaymentSuggestedGrowthAction(paymentId: string) {
  const actions = await getSuggestedActionsForPayments([paymentId]);
  return actions.get(paymentId) ?? null;
}

export async function getStoreSuggestedGrowthActions(storeId: string) {
  const payments = await getPrisma().storePayment.findMany({
    where: { storeId, status: "CONFIRMED", amountCents: { gt: 0 } },
    include: {
      store: {
        select: {
          name: true,
          slug: true,
          owner: { select: { email: true, role: true } },
          acquisitionAttribution: {
            select: {
              id: true,
              sourceType: true,
              partnerId: true,
              referrerStoreId: true,
              partner: { select: { id: true, name: true, commissionRateBps: true } },
              referrerStore: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ confirmedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
    take: 25,
  });
  return [...(await buildSuggestedActions(payments)).values()];
}

export async function getSuggestedActionsForAttributions(attributionIds: string[]) {
  const ids = [...new Set(attributionIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, SuggestedGrowthAction>();

  const attributions = await getPrisma().acquisitionAttribution.findMany({
    where: { id: { in: ids } },
    include: {
      store: {
        include: {
          owner: { select: { email: true, role: true } },
          payments: {
            where: { status: "CONFIRMED", amountCents: { gt: 0 } },
            orderBy: [{ confirmedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
            take: 1,
          },
        },
      },
      partner: { select: { id: true, name: true, commissionRateBps: true } },
      referrerStore: { select: { id: true, name: true } },
    },
  });

  const syntheticPayments = attributions.flatMap((attribution) => {
    const payment = attribution.store.payments[0];
    if (!payment) return [];
    return [
      {
        ...payment,
        store: {
          name: attribution.store.name,
          slug: attribution.store.slug,
          owner: attribution.store.owner,
          acquisitionAttribution: {
            id: attribution.id,
            sourceType: attribution.sourceType,
            partnerId: attribution.partnerId,
            referrerStoreId: attribution.referrerStoreId,
            partner: attribution.partner,
            referrerStore: attribution.referrerStore,
          },
        },
      },
    ];
  });
  const actionsByPayment = await buildSuggestedActions(syntheticPayments);
  const actionsByAttribution = new Map<string, SuggestedGrowthAction>();

  for (const attribution of attributions) {
    const payment = attribution.store.payments[0];
    if (!payment) {
      actionsByAttribution.set(attribution.id, {
        kind: "NONE",
        status: "NOT_APPLICABLE",
        label: "Esperando pago confirmado",
        description: "Esta tienda todavía no tiene pago confirmado en el ledger.",
        storeName: attribution.store.name,
        paymentAmount: formatStorePaymentMoney(0, "BOB"),
        paymentAmountCents: 0,
        paymentCurrency: "BOB",
        paymentId: "",
        storeId: attribution.storeId,
        attributionId: attribution.id,
      });
      continue;
    }
    const action = actionsByPayment.get(payment.id);
    if (action) actionsByAttribution.set(attribution.id, action);
  }

  return actionsByAttribution;
}

export async function getAdminSuggestedGrowthActionsSummary(): Promise<SuggestedGrowthActionsSummary> {
  const payments = await getPrisma().storePayment.findMany({
    where: commercialRealStorePaymentWhere({ status: "CONFIRMED", amountCents: { gt: 0 } }),
    include: {
      store: {
        select: {
          name: true,
          slug: true,
          owner: { select: { email: true, role: true } },
          acquisitionAttribution: {
            select: {
              id: true,
              sourceType: true,
              partnerId: true,
              referrerStoreId: true,
              partner: { select: { id: true, name: true, commissionRateBps: true } },
              referrerStore: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ confirmedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
  });
  const actions = [...(await buildSuggestedActions(payments)).values()];
  const summary: SuggestedGrowthActionsSummary = {
    commissionSuggested: 0,
    rewardSuggested: 0,
    covered: 0,
    noAction: 0,
    needsReview: 0,
    pendingActions: 0,
    partnerPending: new Map(),
    referrerStorePending: new Map(),
  };

  for (const action of actions) {
    if (action.status === "SUGGESTED" && action.kind === "PARTNER_COMMISSION") {
      summary.commissionSuggested += 1;
      summary.pendingActions += 1;
      if (action.partnerId && !summary.partnerPending.has(action.partnerId)) summary.partnerPending.set(action.partnerId, action);
    } else if (action.status === "SUGGESTED" && action.kind === "STORE_REWARD") {
      summary.rewardSuggested += 1;
      summary.pendingActions += 1;
      if (action.referrerStoreId && !summary.referrerStorePending.has(action.referrerStoreId)) summary.referrerStorePending.set(action.referrerStoreId, action);
    } else if (action.status === "COVERED") {
      summary.covered += 1;
    } else if (action.status === "NEEDS_REVIEW") {
      summary.needsReview += 1;
    } else {
      summary.noAction += 1;
    }
  }

  return summary;
}
