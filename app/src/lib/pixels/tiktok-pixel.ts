import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { canTrackMarketing, type TrackingConsent } from "@/lib/tracking/consent";

export type ActiveTikTokPixel = {
  pixelId: string;
};

export type TikTokPixelPageViewEvent = {
  eventName: "PageView";
  eventId: string;
  params: Record<string, never>;
};

export type TikTokPixelViewContentEvent = {
  eventName: "ViewContent";
  eventId: string;
  params: {
    content_ids: string[];
    content_name: string;
    content_type: "product";
    currency: string;
    value: number;
  };
};

export type TikTokPixelEvent = TikTokPixelPageViewEvent | TikTokPixelViewContentEvent;

type TikTokPixelIntegrationRecord = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  pixelId: string | null;
  browserPixelEnabled: boolean;
};

type TikTokPixelDb = {
  storePixelIntegration: {
    findFirst: (args: unknown) => Promise<TikTokPixelIntegrationRecord | null>;
  };
};

export function isTikTokPixelEnabledForStore(integration: TikTokPixelIntegrationRecord | null | undefined, consent: TrackingConsent) {
  return (
    canTrackMarketing(consent) &&
    integration?.platform === StorePixelPlatform.TIKTOK &&
    integration.status === StorePixelStatus.ACTIVE &&
    integration.browserPixelEnabled &&
    Boolean(integration.pixelId?.trim())
  );
}

export async function getActiveTikTokPixelForStore(
  storeId: string,
  options: { consent: TrackingConsent; db?: TikTokPixelDb },
): Promise<ActiveTikTokPixel | null> {
  const db = options.db ?? (getPrisma() as unknown as TikTokPixelDb);
  const integration = await db.storePixelIntegration.findFirst({
    where: {
      storeId,
      platform: StorePixelPlatform.TIKTOK,
      status: StorePixelStatus.ACTIVE,
      browserPixelEnabled: true,
      pixelId: { not: null },
    },
    select: {
      platform: true,
      status: true,
      pixelId: true,
      browserPixelEnabled: true,
    },
  });

  if (!isTikTokPixelEnabledForStore(integration, options.consent) || !integration?.pixelId) return null;
  return { pixelId: integration.pixelId };
}

export function buildTikTokPageViewEvent(eventId: string): TikTokPixelPageViewEvent {
  return {
    eventName: "PageView",
    eventId,
    params: {},
  };
}

export function buildTikTokViewContentEvent(input: {
  eventId: string;
  productId: string;
  productName: string;
  currency: string;
  valueCents: number;
}): TikTokPixelViewContentEvent {
  return {
    eventName: "ViewContent",
    eventId: input.eventId,
    params: {
      content_ids: [input.productId],
      content_name: input.productName,
      content_type: "product",
      currency: input.currency,
      value: Math.max(0, input.valueCents) / 100,
    },
  };
}
