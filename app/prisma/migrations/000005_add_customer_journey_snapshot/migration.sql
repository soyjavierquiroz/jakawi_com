CREATE TYPE "CustomerJourneyStatus" AS ENUM ('ACTIVE', 'ENGAGED', 'READY_FOR_CHANNEL', 'CHANNEL_CONNECTED', 'CONVERTED', 'LOST', 'EXPIRED');
CREATE TYPE "CustomerJourneyStage" AS ENUM ('DISCOVERY', 'PRODUCT_ADVISOR', 'DECISION_SUPPORT', 'CLOSING_PREP');
CREATE TYPE "JourneyEventType" AS ENUM ('JOURNEY_STARTED', 'STORE_VIEWED', 'CATEGORY_VIEWED', 'PRODUCT_VIEWED', 'SELLER_AI_OPENED', 'AI_MESSAGE_SENT', 'CUSTOMER_MESSAGE_SENT', 'NEED_DETECTED', 'PRODUCT_RECOMMENDED', 'OBJECTION_DETECTED', 'INTENT_UPDATED', 'LEAD_CREATED', 'SNAPSHOT_CREATED', 'CHANNEL_CLICKED', 'STATUS_CHANGED');
CREATE TYPE "CommercialSnapshotChannel" AS ENUM ('WHATSAPP', 'WHATSAPP_BOT', 'EMAIL', 'INSTAGRAM', 'MESSENGER', 'MANUAL');

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "commercialType" TEXT DEFAULT 'PRODUCT_STORE';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "journeyId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "snapshotId" TEXT;

CREATE TABLE "CustomerJourney" (
  "id" TEXT NOT NULL,
  "journeyCode" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "source" TEXT,
  "status" "CustomerJourneyStatus" NOT NULL DEFAULT 'ACTIVE',
  "stage" "CustomerJourneyStage" NOT NULL DEFAULT 'DISCOVERY',
  "currentProductId" TEXT,
  "currentCategoryId" TEXT,
  "detectedNeed" TEXT,
  "budget" TEXT,
  "urgency" TEXT,
  "objections" TEXT,
  "conversationSummary" TEXT,
  "intentScore" INTEGER NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "city" TEXT,
  "viewedProducts" JSONB,
  "recommendedProducts" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerJourney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyEvent" (
  "id" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "type" "JourneyEventType" NOT NULL,
  "productId" TEXT,
  "categoryId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JourneyEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialSnapshot" (
  "id" TEXT NOT NULL,
  "snapshotCode" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "leadId" TEXT,
  "channel" "CommercialSnapshotChannel" NOT NULL DEFAULT 'WHATSAPP',
  "customerSummary" TEXT,
  "detectedNeed" TEXT,
  "currentItem" JSONB,
  "recommendedItems" JSONB,
  "viewedItems" JSONB,
  "objections" TEXT,
  "budget" TEXT,
  "urgency" TEXT,
  "intentScore" INTEGER NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "city" TEXT,
  "channelMessage" TEXT,
  "whatsappMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerJourney_journeyCode_key" ON "CustomerJourney"("journeyCode");
CREATE INDEX "CustomerJourney_storeId_idx" ON "CustomerJourney"("storeId");
CREATE INDEX "CustomerJourney_sessionId_idx" ON "CustomerJourney"("sessionId");
CREATE INDEX "CustomerJourney_status_idx" ON "CustomerJourney"("status");
CREATE INDEX "CustomerJourney_stage_idx" ON "CustomerJourney"("stage");
CREATE INDEX "CustomerJourney_createdAt_idx" ON "CustomerJourney"("createdAt");

CREATE INDEX "JourneyEvent_journeyId_idx" ON "JourneyEvent"("journeyId");
CREATE INDEX "JourneyEvent_type_idx" ON "JourneyEvent"("type");
CREATE INDEX "JourneyEvent_createdAt_idx" ON "JourneyEvent"("createdAt");

CREATE UNIQUE INDEX "CommercialSnapshot_snapshotCode_key" ON "CommercialSnapshot"("snapshotCode");
CREATE INDEX "CommercialSnapshot_journeyId_idx" ON "CommercialSnapshot"("journeyId");
CREATE INDEX "CommercialSnapshot_leadId_idx" ON "CommercialSnapshot"("leadId");
CREATE INDEX "CommercialSnapshot_channel_idx" ON "CommercialSnapshot"("channel");
CREATE INDEX "CommercialSnapshot_createdAt_idx" ON "CommercialSnapshot"("createdAt");

CREATE INDEX "Lead_journeyId_idx" ON "Lead"("journeyId");
CREATE INDEX "Lead_snapshotId_idx" ON "Lead"("snapshotId");

ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_currentProductId_fkey" FOREIGN KEY ("currentProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_currentCategoryId_fkey" FOREIGN KEY ("currentCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CustomerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialSnapshot" ADD CONSTRAINT "CommercialSnapshot_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CustomerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialSnapshot" ADD CONSTRAINT "CommercialSnapshot_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CommercialSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
