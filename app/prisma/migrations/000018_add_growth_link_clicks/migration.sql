-- Track referral and partner link clicks before signup. This stores no raw IP and has no automatic payout behavior.

CREATE TABLE "GrowthLinkClick" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "partnerId" TEXT,
    "partnerDestinationId" TEXT,
    "referrerStoreId" TEXT,
    "code" TEXT,
    "destinationSlug" TEXT,
    "landingPath" TEXT NOT NULL,
    "targetUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "visitorId" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthLinkClick_sourceType_idx" ON "GrowthLinkClick"("sourceType");
CREATE INDEX "GrowthLinkClick_partnerId_idx" ON "GrowthLinkClick"("partnerId");
CREATE INDEX "GrowthLinkClick_partnerDestinationId_idx" ON "GrowthLinkClick"("partnerDestinationId");
CREATE INDEX "GrowthLinkClick_referrerStoreId_idx" ON "GrowthLinkClick"("referrerStoreId");
CREATE INDEX "GrowthLinkClick_code_idx" ON "GrowthLinkClick"("code");
CREATE INDEX "GrowthLinkClick_destinationSlug_idx" ON "GrowthLinkClick"("destinationSlug");
CREATE INDEX "GrowthLinkClick_clickedAt_idx" ON "GrowthLinkClick"("clickedAt");
CREATE INDEX "GrowthLinkClick_sourceType_clickedAt_idx" ON "GrowthLinkClick"("sourceType", "clickedAt");
CREATE INDEX "GrowthLinkClick_partnerId_clickedAt_idx" ON "GrowthLinkClick"("partnerId", "clickedAt");
CREATE INDEX "GrowthLinkClick_referrerStoreId_clickedAt_idx" ON "GrowthLinkClick"("referrerStoreId", "clickedAt");

ALTER TABLE "GrowthLinkClick"
ADD CONSTRAINT "GrowthLinkClick_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrowthLinkClick"
ADD CONSTRAINT "GrowthLinkClick_partnerDestinationId_fkey"
FOREIGN KEY ("partnerDestinationId") REFERENCES "PartnerDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrowthLinkClick"
ADD CONSTRAINT "GrowthLinkClick_referrerStoreId_fkey"
FOREIGN KEY ("referrerStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
