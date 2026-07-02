import { createHmac, randomUUID } from "node:crypto";
import { getCrmWebhookConfig, type CrmWebhookConfig } from "@/config/crm-webhook";
import { getCountryCommerceConfig, normalizeCountryCode, normalizeCurrency } from "@/config/countries";

export type CrmWebhookEventType =
  | "owner.registered"
  | "trial.started"
  | "onboarding.needed"
  | "partner.activated"
  | "qa.crm_webhook.test";

export type CrmWebhookMarketSegment = "BOLIVIA" | "INTERNATIONAL" | "PARTNER";

export type CrmWebhookPayload = {
  event: CrmWebhookEventType;
  event_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  store_slug?: string;
  partner_name?: string;
  partner_code?: string;
  partner_status?: string;
  partner_portal_status?: string;
  country?: string;
  country_code?: string;
  currency?: string;
  market_segment?: CrmWebhookMarketSegment;
  pricing_region?: string;
  payment_route?: string;
  plan_key?: string;
  plan_status?: string;
  seller_ai_enabled?: boolean;
  product_count_bucket?: string;
  lead_count_bucket?: string;
  attribution_type?: string;
  onboarding_status?: string;
  source_flow?: string;
  created_at?: string;
  qa?: boolean;
};

type CrmWebhookLogger = Pick<Console, "info" | "warn">;

type CrmWebhookFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  ok: boolean;
  text: () => Promise<string>;
}>;

type SendCrmEventDeps = {
  config?: CrmWebhookConfig;
  fetch?: CrmWebhookFetch;
  logger?: CrmWebhookLogger;
  now?: () => Date;
};

export type CrmWebhookSendResult =
  | {
      ok: false;
      sent: false;
      eventId: string;
      eventType: CrmWebhookEventType;
      reason: "disabled" | "missing_secret" | "qa_only_blocked" | "invalid_url";
    }
  | {
      ok: boolean;
      sent: true;
      eventId: string;
      eventType: CrmWebhookEventType;
      status?: number;
      response?: unknown;
      error?: string;
    };

export function buildCrmEventPayload(payload: CrmWebhookPayload): CrmWebhookPayload {
  return {
    event: payload.event,
    event_id: payload.event_id || randomUUID(),
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    business_name: payload.business_name,
    store_slug: payload.store_slug,
    partner_name: payload.partner_name,
    partner_code: payload.partner_code,
    partner_status: payload.partner_status,
    partner_portal_status: payload.partner_portal_status,
    country: payload.country,
    country_code: payload.country_code,
    currency: payload.currency,
    market_segment: payload.market_segment,
    pricing_region: payload.pricing_region,
    payment_route: payload.payment_route,
    plan_key: payload.plan_key,
    plan_status: payload.plan_status,
    seller_ai_enabled: payload.seller_ai_enabled,
    product_count_bucket: payload.product_count_bucket,
    lead_count_bucket: payload.lead_count_bucket,
    attribution_type: payload.attribution_type,
    onboarding_status: payload.onboarding_status,
    source_flow: payload.source_flow,
    created_at: payload.created_at,
    qa: payload.qa,
  };
}

export function signCrmWebhookPayload(params: { rawBody: string; secret: string; timestamp: number }) {
  return createHmac("sha256", params.secret).update(`${params.timestamp}.${params.rawBody}`).digest("hex");
}

export function buildCrmWebhookHeaders(params: { eventId: string; rawBody: string; secret: string; timestamp: number }) {
  return {
    "Content-Type": "application/json",
    "X-JAKAWI-Event-Id": params.eventId,
    "X-JAKAWI-Signature": `sha256=${signCrmWebhookPayload(params)}`,
    "X-JAKAWI-Timestamp": String(params.timestamp),
  };
}

export function isCrmWebhookQaEvent(payload: CrmWebhookPayload) {
  return payload.qa === true || payload.event.startsWith("qa.") || payload.attribution_type === "QA" || payload.source_flow === "QA";
}

function endpointForLog(url: URL) {
  return `${url.hostname}${url.pathname}`;
}

function sanitizeError(error: unknown, secret: string) {
  const message = error instanceof Error ? error.message : String(error);
  const clean = secret ? message.replaceAll(secret, "[redacted]") : message;
  return clean.slice(0, 240);
}

function parseResponseBody(text: string) {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text.slice(0, 500);
  }
}

export async function sendCrmEvent(payloadInput: CrmWebhookPayload, deps: SendCrmEventDeps = {}): Promise<CrmWebhookSendResult> {
  const config = deps.config ?? getCrmWebhookConfig();
  const payload = buildCrmEventPayload(payloadInput);
  const eventId = payload.event_id;
  const eventType = payload.event;
  const logger = deps.logger ?? console;

  if (!config.enabled) return { ok: false, sent: false, eventId, eventType, reason: "disabled" };
  if (!config.secret) {
    logger.warn("CRM webhook not sent", { eventType, eventId, reason: "missing_secret" });
    return { ok: false, sent: false, eventId, eventType, reason: "missing_secret" };
  }
  if (config.qaOnly && !isCrmWebhookQaEvent(payload)) {
    logger.warn("CRM webhook not sent", { eventType, eventId, reason: "qa_only_blocked" });
    return { ok: false, sent: false, eventId, eventType, reason: "qa_only_blocked" };
  }

  let url: URL;
  try {
    url = new URL(config.url);
  } catch {
    logger.warn("CRM webhook not sent", { eventType, eventId, reason: "invalid_url" });
    return { ok: false, sent: false, eventId, eventType, reason: "invalid_url" };
  }

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor((deps.now?.() ?? new Date()).getTime() / 1000);
  const headers = buildCrmWebhookHeaders({ eventId, rawBody, secret: config.secret, timestamp });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await (deps.fetch ?? fetch)(config.url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    const responseText = await response.text();
    const parsedResponse = parseResponseBody(responseText);
    const logPayload = { eventType, eventId, endpoint: endpointForLog(url), status: response.status };

    if (response.ok) {
      logger.info("CRM webhook sent", logPayload);
    } else {
      logger.warn("CRM webhook returned non-2xx", logPayload);
    }

    return {
      ok: response.ok,
      sent: true,
      eventId,
      eventType,
      status: response.status,
      response: parsedResponse,
    };
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === "AbortError" ? "timeout" : sanitizeError(error, config.secret);
    logger.warn("CRM webhook failed", { eventType, eventId, endpoint: endpointForLog(url), error: errorMessage });
    return { ok: false, sent: true, eventId, eventType, error: errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}

function marketSegmentForStore(countryCode?: string | null): Exclude<CrmWebhookMarketSegment, "PARTNER"> {
  return normalizeCountryCode(countryCode) === "BO" ? "BOLIVIA" : "INTERNATIONAL";
}

function pricingRegionForStore(currency?: string | null, countryCode?: string | null) {
  const normalizedCurrency = normalizeCurrency(currency, countryCode);
  return normalizedCurrency === "BOB" ? "BOB" : "USD_BASE";
}

type OwnerCrmInput = {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  store: {
    id: string;
    name: string;
    slug: string;
    countryCode?: string | null;
    countryName?: string | null;
    currency?: string | null;
    plan?: string | null;
    planStatus?: string | null;
    createdAt?: Date | null;
  };
  event?: Extract<CrmWebhookEventType, "owner.registered" | "trial.started" | "onboarding.needed">;
  eventId?: string;
  sourceFlow?: string;
  productCountBucket?: string;
  leadCountBucket?: string;
};

export function buildOwnerCrmEventPayload(input: OwnerCrmInput) {
  const countryCode = normalizeCountryCode(input.store.countryCode);
  const currency = normalizeCurrency(input.store.currency, countryCode);
  const countryConfig = getCountryCommerceConfig(countryCode);
  const event = input.event ?? "owner.registered";

  return buildCrmEventPayload({
    event,
    event_id: input.eventId ?? `${event}:${input.user.id}:${input.store.id}`,
    email: input.user.email,
    first_name: input.user.firstName ?? undefined,
    last_name: input.user.lastName ?? undefined,
    business_name: input.store.name,
    store_slug: input.store.slug,
    country: input.store.countryName ?? countryConfig.countryName,
    country_code: countryCode,
    currency,
    market_segment: marketSegmentForStore(countryCode),
    pricing_region: pricingRegionForStore(currency, countryCode),
    payment_route: countryConfig.defaultPaymentProvider,
    plan_key: input.store.plan ?? "TRIAL",
    plan_status: input.store.planStatus ?? "TRIALING",
    seller_ai_enabled: false,
    product_count_bucket: input.productCountBucket ?? "0",
    lead_count_bucket: input.leadCountBucket ?? "0",
    attribution_type: input.sourceFlow === "QA" ? "QA" : undefined,
    onboarding_status: event === "onboarding.needed" ? "NEEDED" : undefined,
    source_flow: input.sourceFlow,
    created_at: (input.store.createdAt ?? new Date()).toISOString(),
    qa: input.sourceFlow === "QA" ? true : undefined,
  });
}

export function buildPartnerCrmEventPayload(input: {
  partner: {
    id: string;
    name: string;
    code: string;
    contactName?: string | null;
    contactEmail?: string | null;
    status?: string | null;
    createdAt?: Date | null;
  };
  eventId?: string;
  sourceFlow?: string;
}) {
  return buildCrmEventPayload({
    event: "partner.activated",
    event_id: input.eventId ?? `partner.activated:${input.partner.id}`,
    email: input.partner.contactEmail ?? undefined,
    first_name: input.partner.contactName ?? undefined,
    partner_name: input.partner.name,
    partner_code: input.partner.code,
    partner_status: input.partner.status ?? "ACTIVE",
    partner_portal_status: "PENDING",
    country: "Bolivia",
    country_code: "BO",
    market_segment: "PARTNER",
    attribution_type: input.sourceFlow === "QA" ? "QA" : undefined,
    source_flow: input.sourceFlow,
    created_at: (input.partner.createdAt ?? new Date()).toISOString(),
    qa: input.sourceFlow === "QA" ? true : undefined,
  });
}

export function buildQaCrmWebhookTestPayload(eventId = `qa-crm-webhook-test-${randomUUID()}`) {
  const now = new Date();
  return buildCrmEventPayload({
    event: "qa.crm_webhook.test",
    event_id: eventId,
    email: "qa-crm-webhook-test@example.com",
    first_name: "QA",
    business_name: "JAKAWI CRM QA",
    store_slug: "qa-crm-webhook-test",
    country: "Bolivia",
    country_code: "BO",
    currency: "BOB",
    market_segment: "BOLIVIA",
    pricing_region: "BOB",
    payment_route: "MANUAL_BOLIVIA",
    plan_key: "TRIAL",
    plan_status: "TRIALING",
    seller_ai_enabled: false,
    product_count_bucket: "0",
    lead_count_bucket: "0",
    attribution_type: "QA",
    source_flow: "QA",
    created_at: now.toISOString(),
    qa: true,
  });
}

export async function sendOwnerCrmEvent(input: OwnerCrmInput, deps?: SendCrmEventDeps) {
  return sendCrmEvent(buildOwnerCrmEventPayload(input), deps);
}

export async function sendPartnerCrmEvent(input: Parameters<typeof buildPartnerCrmEventPayload>[0], deps?: SendCrmEventDeps) {
  return sendCrmEvent(buildPartnerCrmEventPayload(input), deps);
}

export async function sendQaCrmWebhookTestEvent(deps?: SendCrmEventDeps) {
  return sendCrmEvent(buildQaCrmWebhookTestPayload(), deps);
}
