import { StorePixelPlatform, type StorePixelStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type AdminBetaReadiness = "READY" | "NEEDS_ATTENTION" | "SUSPENDED";

type AdminBetaIntegrationInput = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  browserPixelEnabled: boolean;
  capiEnabled: boolean;
};

type AdminBetaDomainInput = {
  hostname: string;
  status: string;
};

type AdminBetaPaymentInput = {
  status: string;
  amountCents: number;
  currency: string;
  paidAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
};

export type AdminBetaStoreInput = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  isPublished: boolean;
  plan: string;
  planStatus: string;
  trialEndsAt: Date | null;
  planRenewsAt: Date | null;
  owner: { email: string };
  productCount: number;
  visibleProductCount: number;
  integrations: AdminBetaIntegrationInput[];
  domain: AdminBetaDomainInput | null;
  latestPayment: AdminBetaPaymentInput | null;
};

export type AdminBetaStoreSnapshot = {
  storeId: string;
  storeName: string;
  slug: string;
  ownerEmail: string;
  productCount: number;
  visibleProductCount: number;
  plan: string;
  planStatus: string;
  trialEndsAt: Date | null;
  planRenewsAt: Date | null;
  integrations: Array<{
    platform: StorePixelPlatform;
    state: "ON" | "OFF";
    configured: boolean;
  }>;
  domain: AdminBetaDomainInput | null;
  latestPayment: AdminBetaPaymentInput | null;
  readiness: AdminBetaReadiness;
  warnings: string[];
};

const betaPlatforms = [StorePixelPlatform.META, StorePixelPlatform.TIKTOK, StorePixelPlatform.GOOGLE] as const;

export function redactAdminBetaEmail(email: string) {
  const [local = "", domain = ""] = email.trim().split("@");
  if (!domain) return "oculto";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function isSuspendedPlan(planStatus: string) {
  return ["SUSPENDED", "CANCELED", "CANCELLED"].includes(planStatus.trim().toUpperCase());
}

export function buildAdminBetaStoreSnapshot(store: AdminBetaStoreInput): AdminBetaStoreSnapshot {
  const warnings: string[] = [];
  const slug = store.slug.trim();
  const whatsapp = store.whatsapp.trim();
  const planStatus = store.planStatus.trim().toUpperCase();
  const billingPending = planStatus === "PAST_DUE" || store.latestPayment?.status.toUpperCase() === "PENDING";

  if (!slug) warnings.push("Requiere completar el slug de tienda");
  if (!whatsapp) warnings.push("Requiere completar WhatsApp");
  if (!store.isPublished) warnings.push("Storefront público apagado");
  if (store.visibleProductCount < 1) warnings.push("Requiere al menos un producto visible");
  if (billingPending) warnings.push("Pago manual pendiente");

  const integrations = betaPlatforms.map((platform) => {
    const integration = store.integrations.find((item) => item.platform === platform);
    const enabled = Boolean(
      integration &&
        integration.status === "ACTIVE" &&
        (integration.browserPixelEnabled || integration.capiEnabled),
    );
    return {
      platform,
      state: enabled ? ("ON" as const) : ("OFF" as const),
      configured: Boolean(integration),
    };
  });

  if (integrations.every((integration) => integration.state === "OFF")) {
    warnings.push("Integraciones apagadas");
  }

  let readiness: AdminBetaReadiness = "READY";
  if (isSuspendedPlan(planStatus)) {
    readiness = "SUSPENDED";
    warnings.unshift("Plan suspendido o cancelado");
  } else if (
    !slug ||
    !whatsapp ||
    !store.isPublished ||
    store.visibleProductCount < 1 ||
    billingPending
  ) {
    readiness = "NEEDS_ATTENTION";
  }

  return {
    storeId: store.id,
    storeName: store.name,
    slug,
    ownerEmail: redactAdminBetaEmail(store.owner.email),
    productCount: store.productCount,
    visibleProductCount: store.visibleProductCount,
    plan: store.plan,
    planStatus,
    trialEndsAt: store.trialEndsAt,
    planRenewsAt: store.planRenewsAt,
    integrations,
    domain: store.domain,
    latestPayment: store.latestPayment,
    readiness,
    warnings,
  };
}

export async function getAdminBetaOperationsSnapshots() {
  const prisma = getPrisma();
  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      whatsapp: true,
      isPublished: true,
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      planRenewsAt: true,
      owner: { select: { email: true } },
      pixelIntegrations: {
        select: {
          platform: true,
          status: true,
          browserPixelEnabled: true,
          capiEnabled: true,
        },
      },
      domains: {
        select: { hostname: true, status: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      payments: {
        where: { amountCents: { gt: 0 } },
        select: {
          status: true,
          amountCents: true,
          currency: true,
          paidAt: true,
          confirmedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const visibleCounts = stores.length
    ? await prisma.product.groupBy({
        by: ["storeId"],
        where: { storeId: { in: stores.map((store) => store.id) }, isVisible: true },
        _count: { _all: true },
      })
    : [];
  const visibleCountByStore = new Map(visibleCounts.map((row) => [row.storeId, row._count._all]));

  return stores.map((store) =>
    buildAdminBetaStoreSnapshot({
      id: store.id,
      name: store.name,
      slug: store.slug,
      whatsapp: store.whatsapp,
      isPublished: store.isPublished,
      plan: store.plan,
      planStatus: store.planStatus,
      trialEndsAt: store.trialEndsAt,
      planRenewsAt: store.planRenewsAt,
      owner: store.owner,
      productCount: store._count.products,
      visibleProductCount: visibleCountByStore.get(store.id) ?? 0,
      integrations: store.pixelIntegrations,
      domain: store.domains[0] ?? null,
      latestPayment: store.payments[0] ?? null,
    }),
  );
}
