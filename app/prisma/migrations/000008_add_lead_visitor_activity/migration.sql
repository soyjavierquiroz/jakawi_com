ALTER TABLE "Lead" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "CustomerJourney" ADD COLUMN "visitorId" TEXT;

CREATE INDEX "Lead_storeId_lastActivityAt_idx" ON "Lead"("storeId", "lastActivityAt");
CREATE INDEX "Lead_visitorId_idx" ON "Lead"("visitorId");
CREATE INDEX "CustomerJourney_visitorId_idx" ON "CustomerJourney"("visitorId");
