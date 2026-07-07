import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { canTrackMarketing, type TrackingConsent } from "@/lib/tracking/consent";

export type ActiveMetaPixel = {
  pixelId: string;
};

export type MetaPixelPageViewEvent = {
  eventName: "PageView";
  eventId: string;
  params: Record<string, never>;
};

export type MetaPixelViewContentEvent = {
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

export type MetaPixelEvent = MetaPixelPageViewEvent | MetaPixelViewContentEvent;

type MetaPixelIntegrationRecord = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  pixelId: string | null;
  browserPixelEnabled: boolean;
};

type MetaPixelDb = {
  storePixelIntegration: {
    findFirst: (args: unknown) => Promise<MetaPixelIntegrationRecord | null>;
  };
};

export function isMetaPixelEnabledForStore(integration: MetaPixelIntegrationRecord | null | undefined, consent: TrackingConsent) {
  return (
    canTrackMarketing(consent) &&
    integration?.platform === StorePixelPlatform.META &&
    integration.status === StorePixelStatus.ACTIVE &&
    integration.browserPixelEnabled &&
    Boolean(integration.pixelId?.trim())
  );
}

export async function getActiveMetaPixelForStore(
  storeId: string,
  options: { consent: TrackingConsent; db?: MetaPixelDb },
): Promise<ActiveMetaPixel | null> {
  const db = options.db ?? (getPrisma() as unknown as MetaPixelDb);
  const integration = await db.storePixelIntegration.findFirst({
    where: {
      storeId,
      platform: StorePixelPlatform.META,
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

  if (!isMetaPixelEnabledForStore(integration, options.consent) || !integration?.pixelId) return null;
  return { pixelId: integration.pixelId };
}

export function buildMetaPixelPageViewEvent(eventId: string): MetaPixelPageViewEvent {
  return {
    eventName: "PageView",
    eventId,
    params: {},
  };
}

export function buildMetaPixelViewContentEvent(input: {
  eventId: string;
  productId: string;
  productName: string;
  currency: string;
  valueCents: number;
}): MetaPixelViewContentEvent {
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
