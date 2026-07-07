import { createHash } from "crypto";
import { Prisma, type TrackingScope as PrismaTrackingScope } from "@prisma/client";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { getVisitorInfoFromHeaders } from "@/lib/visitor";
import { defaultTrackingConsent, parseConsent, type TrackingConsent } from "@/lib/tracking/consent";
import { createTrackingEventId, normalizeTrackingId } from "@/lib/tracking/ids";
import { isEventAllowedForScope, type TrackingEventName, type TrackingScope } from "@/lib/tracking/events";

export type InternalTrackingEventInput = {
  eventId?: string;
  scope: TrackingScope;
  eventName: TrackingEventName;
  storeId?: string | null;
  productId?: string | null;
  userId?: string | null;
  leadId?: string | null;
  visitorId?: string | null;
  journeyId?: string | null;
  source?: string | null;
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  ipHash?: string | null;
  consent?: Partial<TrackingConsent> | string | null;
  metadata?: Prisma.InputJsonValue | null;
  occurredAt?: Date;
};

export type InternalTrackingEventResult =
  | { ok: true; eventId: string; duplicate?: boolean }
  | { ok: false; eventId: string; reason: string };

type TrackingEventDb = {
  trackingEvent: {
    create: (args: { data: Prisma.TrackingEventUncheckedCreateInput }) => Promise<unknown>;
  };
};

function truncate(value: string | null | undefined, maxLength: number) {
  const clean = value?.trim();
  if (!clean) return null;
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

export function hashTrackingIp(ip: string) {
  const salt = process.env.SESSION_SECRET ?? "jakawi-first-party-tracking";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function isUniqueConstraintError(error: unknown) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

async function requestDefaults() {
  try {
    const headerStore = await headers();
    const visitor = getVisitorInfoFromHeaders(headerStore);
    return {
      path: truncate(headerStore.get("x-invoke-path") ?? headerStore.get("next-url"), 1000),
      referrer: truncate(headerStore.get("referer") ?? headerStore.get("referrer"), 1000),
      userAgent: truncate(headerStore.get("user-agent"), 500),
      ipHash: visitor.ip ? hashTrackingIp(visitor.ip) : null,
    };
  } catch {
    return {
      path: null,
      referrer: null,
      userAgent: null,
      ipHash: null,
    };
  }
}

export async function trackInternalEvent(
  input: InternalTrackingEventInput,
  options: { db?: TrackingEventDb } = {},
): Promise<InternalTrackingEventResult> {
  const eventId = input.eventId ?? createTrackingEventId();
  if (!isEventAllowedForScope(input.scope, input.eventName)) {
    return { ok: false, eventId, reason: "event_not_allowed_for_scope" };
  }

  const consent = parseConsent(input.consent ?? defaultTrackingConsent);
  const defaults = await requestDefaults();
  const db = options.db ?? getPrisma();
  const ipHash = input.ipHash ?? (input.ip ? hashTrackingIp(input.ip) : defaults.ipHash);

  try {
    await db.trackingEvent.create({
      data: {
        eventId,
        scope: input.scope as PrismaTrackingScope,
        eventName: input.eventName,
        storeId: truncate(input.storeId, 160),
        productId: truncate(input.productId, 160),
        userId: truncate(input.userId, 160),
        leadId: truncate(input.leadId, 160),
        visitorId: normalizeTrackingId(input.visitorId) ?? truncate(input.visitorId, 160),
        journeyId: normalizeTrackingId(input.journeyId) ?? truncate(input.journeyId, 160),
        source: truncate(input.source, 120),
        path: truncate(input.path, 1000) ?? defaults.path,
        referrer: truncate(input.referrer, 1000) ?? defaults.referrer,
        userAgent: truncate(input.userAgent, 500) ?? defaults.userAgent,
        ipHash: truncate(ipHash, 160),
        consentNecessary: consent.necessary,
        consentAnalytics: consent.analytics,
        consentMarketing: consent.marketing,
        metadata: input.metadata ?? Prisma.JsonNull,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
    return { ok: true, eventId };
  } catch (error) {
    if (isUniqueConstraintError(error)) return { ok: true, eventId, duplicate: true };
    console.warn("Internal tracking event failed", { eventName: input.eventName, scope: input.scope });
    return { ok: false, eventId, reason: "tracking_write_failed" };
  }
}
