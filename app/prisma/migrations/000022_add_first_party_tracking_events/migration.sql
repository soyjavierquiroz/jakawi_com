CREATE TYPE "TrackingScope" AS ENUM ('PLATFORM', 'STORE');

CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scope" "TrackingScope" NOT NULL,
    "eventName" TEXT NOT NULL,
    "storeId" TEXT,
    "productId" TEXT,
    "userId" TEXT,
    "leadId" TEXT,
    "visitorId" TEXT,
    "journeyId" TEXT,
    "source" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "consentNecessary" BOOLEAN NOT NULL DEFAULT true,
    "consentAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackingEvent_eventId_key" ON "TrackingEvent"("eventId");
CREATE INDEX "TrackingEvent_scope_eventName_occurredAt_idx" ON "TrackingEvent"("scope", "eventName", "occurredAt");
CREATE INDEX "TrackingEvent_storeId_occurredAt_idx" ON "TrackingEvent"("storeId", "occurredAt");
CREATE INDEX "TrackingEvent_productId_occurredAt_idx" ON "TrackingEvent"("productId", "occurredAt");
CREATE INDEX "TrackingEvent_userId_occurredAt_idx" ON "TrackingEvent"("userId", "occurredAt");
CREATE INDEX "TrackingEvent_leadId_occurredAt_idx" ON "TrackingEvent"("leadId", "occurredAt");
CREATE INDEX "TrackingEvent_visitorId_idx" ON "TrackingEvent"("visitorId");
CREATE INDEX "TrackingEvent_journeyId_idx" ON "TrackingEvent"("journeyId");
