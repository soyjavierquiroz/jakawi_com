import { Prisma, StorePixelPlatform, StorePixelStatus, TrackingScope } from "@prisma/client";
import { getMetaCapiConfig } from "@/config/meta-capi";
import { decryptSecret } from "@/lib/crypto/encryption";
import { getPrisma } from "@/lib/prisma";

export type MetaCapiEventName = "PageView" | "ViewContent" | "Contact" | "Lead";

export type MetaCapiEvent = {
  event_name: MetaCapiEventName;
  event_time: number;
  event_id: string;
  action_source: "website";
  user_data: {
    client_user_agent?: string;
  };
  custom_data?: {
    content_ids?: string[];
    content_name?: string;
    content_type?: "product";
    currency?: string;
    value?: number;
  };
};

type MetaCapiIntegrationRecord = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  pixelId: string | null;
  accessTokenEncrypted: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
};

type MetaCapiTrackingEventRecord = {
  id?: string;
  eventId: string;
  scope: TrackingScope;
  eventName: string;
  storeId: string | null;
  productId: string | null;
  visitorId: string | null;
  journeyId: string | null;
  userAgent: string | null;
  consentMarketing: boolean;
  metadata: Prisma.JsonValue | null;
  occurredAt: Date;
};

type MetaCapiDb = {
  storePixelIntegration: {
    findFirst: (args: unknown) => Promise<MetaCapiIntegrationRecord | null>;
  };
  trackingEvent: {
    findUnique: (args: unknown) => Promise<MetaCapiTrackingEventRecord | null>;
    findMany?: (args: unknown) => Promise<MetaCapiTrackingEventRecord[]>;
    update: (args: unknown) => Promise<unknown>;
  };
};

export type MetaCapiSendResult =
  | { ok: true; sent: true; eventId: string; responseId?: string; httpStatus: number }
  | { ok: true; sent: false; eventId?: string; reason: string }
  | { ok: false; sent: true; eventId: string; reason: string; httpStatus?: number };

const eventNameMap: Partial<Record<string, MetaCapiEventName>> = {
  store_view: "PageView",
  product_view: "ViewContent",
  whatsapp_click: "Contact",
  lead_created: "Lead",
  seller_ai_handoff: "Contact",
};

function asObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nestedObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  if (!clean) return undefined;
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function cleanCurrency(value: unknown) {
  const clean = cleanString(value, 3)?.toUpperCase();
  return clean && /^[A-Z]{3}$/.test(clean) ? clean : undefined;
}

function centsToValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, value) / 100;
}

function responseIdFromJson(value: unknown) {
  const body = nestedObject(value);
  const eventsReceived = body.events_received;
  const fbtraceId = cleanString(body.fbtrace_id, 120);
  if (typeof eventsReceived === "number" && fbtraceId) return `${eventsReceived}:${fbtraceId}`;
  return fbtraceId;
}

function metaCapiStatusMetadata(input: { status: "skipped" | "sent" | "error"; httpStatus?: number; responseId?: string; error?: string }) {
  return {
    status: input.status,
    httpStatus: input.httpStatus ?? null,
    responseId: input.responseId ?? null,
    error: input.error ?? null,
    sentAt: input.status === "sent" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
}

async function updateMetaCapiMetadata(
  db: MetaCapiDb,
  trackingEvent: MetaCapiTrackingEventRecord,
  input: { status: "skipped" | "sent" | "error"; httpStatus?: number; responseId?: string; error?: string },
) {
  const metadata = asObject(trackingEvent.metadata);
  await db.trackingEvent.update({
    where: { eventId: trackingEvent.eventId },
    data: {
      metadata: {
        ...metadata,
        metaCapi: metaCapiStatusMetadata(input),
      },
    },
  });
}

export function isMetaCapiGloballyEnabled() {
  return getMetaCapiConfig().enabled;
}

export async function getMetaCapiIntegrationForStore(storeId: string, options: { db?: MetaCapiDb } = {}) {
  const db = options.db ?? (getPrisma() as unknown as MetaCapiDb);
  return db.storePixelIntegration.findFirst({
    where: {
      storeId,
      platform: StorePixelPlatform.META,
      status: StorePixelStatus.ACTIVE,
      capiEnabled: true,
      pixelId: { not: null },
      accessTokenEncrypted: { not: null },
    },
    select: {
      platform: true,
      status: true,
      pixelId: true,
      accessTokenEncrypted: true,
      capiEnabled: true,
      testEventCode: true,
    },
  });
}

export function buildMetaCapiEvent(trackingEvent: MetaCapiTrackingEventRecord, integration: MetaCapiIntegrationRecord): MetaCapiEvent | null {
  if (
    trackingEvent.scope !== TrackingScope.STORE ||
    !trackingEvent.storeId ||
    !trackingEvent.consentMarketing ||
    integration.platform !== StorePixelPlatform.META ||
    integration.status !== StorePixelStatus.ACTIVE ||
    !integration.capiEnabled ||
    !integration.pixelId?.trim() ||
    !integration.accessTokenEncrypted
  ) {
    return null;
  }

  const eventName = eventNameMap[trackingEvent.eventName];
  if (!eventName) return null;

  const metadata = asObject(trackingEvent.metadata);
  const product = nestedObject(metadata.product);
  const productId = cleanString(product.id, 160) ?? cleanString(trackingEvent.productId, 160);
  const contentName = cleanString(product.name, 300);
  const currency = cleanCurrency(product.currency);
  const value = centsToValue(product.valueCents);
  const userAgent = cleanString(trackingEvent.userAgent, 500);
  const event: MetaCapiEvent = {
    event_name: eventName,
    event_time: Math.floor(trackingEvent.occurredAt.getTime() / 1000),
    event_id: trackingEvent.eventId,
    action_source: "website",
    user_data: userAgent ? { client_user_agent: userAgent } : {},
  };

  if (eventName === "ViewContent") {
    event.custom_data = {
      ...(productId ? { content_ids: [productId] } : {}),
      ...(contentName ? { content_name: contentName } : {}),
      ...(productId ? { content_type: "product" as const } : {}),
      ...(currency ? { currency } : {}),
      ...(value !== undefined ? { value } : {}),
    };
  } else if ((eventName === "Contact" || eventName === "Lead") && productId) {
    event.custom_data = { content_ids: [productId] };
  }

  return event;
}

export async function sendMetaCapiEvent(trackingEventId: string, options: { db?: MetaCapiDb; fetch?: typeof fetch } = {}): Promise<MetaCapiSendResult> {
  const config = getMetaCapiConfig();
  if (!config.enabled) return { ok: true, sent: false, eventId: trackingEventId, reason: "disabled" };

  const db = options.db ?? (getPrisma() as unknown as MetaCapiDb);
  const trackingEvent = await db.trackingEvent.findUnique({
    where: { eventId: trackingEventId },
  });
  if (!trackingEvent) return { ok: true, sent: false, eventId: trackingEventId, reason: "tracking_event_not_found" };
  if (trackingEvent.scope !== TrackingScope.STORE || !trackingEvent.storeId) {
    await updateMetaCapiMetadata(db, trackingEvent, { status: "skipped", error: "not_store_event" });
    return { ok: true, sent: false, eventId: trackingEvent.eventId, reason: "not_store_event" };
  }
  if (!trackingEvent.consentMarketing) {
    await updateMetaCapiMetadata(db, trackingEvent, { status: "skipped", error: "marketing_consent_missing" });
    return { ok: true, sent: false, eventId: trackingEvent.eventId, reason: "marketing_consent_missing" };
  }

  const integration = await getMetaCapiIntegrationForStore(trackingEvent.storeId, { db });
  if (!integration) {
    await updateMetaCapiMetadata(db, trackingEvent, { status: "skipped", error: "integration_not_ready" });
    return { ok: true, sent: false, eventId: trackingEvent.eventId, reason: "integration_not_ready" };
  }

  const event = buildMetaCapiEvent(trackingEvent, integration);
  if (!event || !integration.pixelId || !integration.accessTokenEncrypted) {
    await updateMetaCapiMetadata(db, trackingEvent, { status: "skipped", error: "event_not_supported" });
    return { ok: true, sent: false, eventId: trackingEvent.eventId, reason: "event_not_supported" };
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(integration.accessTokenEncrypted);
  } catch {
    await updateMetaCapiMetadata(db, trackingEvent, { status: "error", error: "token_decrypt_failed" });
    return { ok: false, sent: true, eventId: trackingEvent.eventId, reason: "token_decrypt_failed" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const endpoint = `https://graph.facebook.com/${config.graphVersion}/${integration.pixelId}/events`;
  const body = {
    data: [event],
    ...(integration.testEventCode ? { test_event_code: integration.testEventCode } : {}),
  };

  try {
    const response = await (options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseJson = await response.json().catch(() => null);
    const responseId = responseIdFromJson(responseJson);

    if (!response.ok) {
      await updateMetaCapiMetadata(db, trackingEvent, { status: "error", httpStatus: response.status, responseId, error: `http_${response.status}` });
      console.warn("Meta CAPI send failed", { eventId: trackingEvent.eventId, eventName: trackingEvent.eventName, storeId: trackingEvent.storeId, status: response.status });
      return { ok: false, sent: true, eventId: trackingEvent.eventId, reason: `http_${response.status}`, httpStatus: response.status };
    }

    await updateMetaCapiMetadata(db, trackingEvent, { status: "sent", httpStatus: response.status, responseId });
    return { ok: true, sent: true, eventId: trackingEvent.eventId, responseId, httpStatus: response.status };
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "timeout" : "fetch_failed";
    await updateMetaCapiMetadata(db, trackingEvent, { status: "error", error: reason });
    console.warn("Meta CAPI send failed", { eventId: trackingEvent.eventId, eventName: trackingEvent.eventName, storeId: trackingEvent.storeId, error: reason });
    return { ok: false, sent: true, eventId: trackingEvent.eventId, reason };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMetaCapiEventsForStore(storeId: string, eventIds: string[], options: { db?: MetaCapiDb; fetch?: typeof fetch } = {}) {
  const db = options.db ?? (getPrisma() as unknown as MetaCapiDb);
  const results: MetaCapiSendResult[] = [];

  for (const eventId of eventIds) {
    const trackingEvent = await db.trackingEvent.findUnique({ where: { eventId } });
    if (!trackingEvent || trackingEvent.storeId !== storeId) {
      results.push({ ok: true, sent: false, eventId, reason: "tracking_event_not_found_for_store" });
      continue;
    }
    results.push(await sendMetaCapiEvent(eventId, { db, fetch: options.fetch }));
  }

  return results;
}
