import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { getMetaCapiConfig } from "@/config/meta-capi";

export type IntegrationStatusRecord = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  pixelId: string | null;
  accessTokenEncrypted: string | null;
  capiEnabled: boolean;
  browserPixelEnabled: boolean;
  testEventCode: string | null;
};

export type IntegrationStatusSnapshot = {
  platform: StorePixelPlatform;
  pixelIdPresent: boolean;
  browserEnabled: boolean;
  browserOperational: boolean;
  browserBlockedReasons: string[];
  serverEnabled: boolean;
  serverOperational: boolean;
  serverBlockedReasons: string[];
  tokenPresent: boolean;
  testEventCodePresent: boolean;
  requiresMarketingConsent: boolean;
};

export type IntegrationQuickStatus = "ready" | "configured_off" | "missing_configuration" | "not_implemented";

type IntegrationStatusOptions = {
  metaCapiEnabled?: boolean;
};

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function implementedBrowserProvider(platform: StorePixelPlatform) {
  return platform === StorePixelPlatform.META || platform === StorePixelPlatform.TIKTOK;
}

function implementedServerProvider(platform: StorePixelPlatform) {
  return platform === StorePixelPlatform.META;
}

function implementedPlatform(platform: StorePixelPlatform) {
  return platform === StorePixelPlatform.META || platform === StorePixelPlatform.TIKTOK;
}

function configurationPresent(status: IntegrationStatusSnapshot) {
  return status.pixelIdPresent || status.browserEnabled || status.serverEnabled || status.tokenPresent || status.testEventCodePresent;
}

export function getIntegrationQuickStatus(status: IntegrationStatusSnapshot): IntegrationQuickStatus {
  if (!implementedPlatform(status.platform)) return "not_implemented";
  if (status.browserOperational || status.serverOperational) return "ready";
  if (!status.pixelIdPresent) return "missing_configuration";
  if (status.serverEnabled && !status.tokenPresent) return "missing_configuration";
  if (configurationPresent(status)) return "configured_off";
  return "missing_configuration";
}

export function buildIntegrationStatus(
  platform: StorePixelPlatform,
  integration: IntegrationStatusRecord | null | undefined,
  options: IntegrationStatusOptions = {},
): IntegrationStatusSnapshot {
  const metaCapiEnabled = options.metaCapiEnabled ?? getMetaCapiConfig().enabled;
  const pixelIdPresent = present(integration?.pixelId);
  const browserEnabled = Boolean(integration?.browserPixelEnabled);
  const serverEnabled = Boolean(integration?.capiEnabled);
  const tokenPresent = present(integration?.accessTokenEncrypted);
  const testEventCodePresent = present(integration?.testEventCode);
  const browserBlockedReasons: string[] = [];
  const serverBlockedReasons: string[] = [];

  if (!implementedBrowserProvider(platform)) {
    browserBlockedReasons.push("provider not implemented");
  } else if (!integration) {
    browserBlockedReasons.push("integration missing");
  } else {
    if (integration.status !== StorePixelStatus.ACTIVE) browserBlockedReasons.push("status not ACTIVE");
    if (!pixelIdPresent) browserBlockedReasons.push("pixelId missing");
    if (!browserEnabled) browserBlockedReasons.push("browserPixelEnabled false");
  }

  if (!implementedServerProvider(platform)) {
    serverBlockedReasons.push("provider not implemented");
  } else if (!integration) {
    serverBlockedReasons.push("integration missing");
  } else {
    if (integration.status !== StorePixelStatus.ACTIVE) serverBlockedReasons.push("status not ACTIVE");
    if (!pixelIdPresent) serverBlockedReasons.push("pixelId missing");
    if (!serverEnabled) serverBlockedReasons.push("capiEnabled false");
    if (!tokenPresent) serverBlockedReasons.push("access token missing");
    if (!metaCapiEnabled) serverBlockedReasons.push("global META_CAPI_ENABLED false");
  }

  return {
    platform,
    pixelIdPresent,
    browserEnabled,
    browserOperational: browserBlockedReasons.length === 0,
    browserBlockedReasons,
    serverEnabled,
    serverOperational: serverBlockedReasons.length === 0,
    serverBlockedReasons,
    tokenPresent,
    testEventCodePresent,
    requiresMarketingConsent: platform === StorePixelPlatform.META || platform === StorePixelPlatform.TIKTOK,
  };
}
