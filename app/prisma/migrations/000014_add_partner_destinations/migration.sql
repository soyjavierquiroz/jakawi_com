-- Add configurable partner destinations without changing existing partner links.

CREATE TABLE "PartnerDestination" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerDestination_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AcquisitionAttribution"
ADD COLUMN "partnerDestinationId" TEXT,
ADD COLUMN "partnerDestinationSlug" TEXT;

CREATE UNIQUE INDEX "PartnerDestination_partnerId_slug_key" ON "PartnerDestination"("partnerId", "slug");
CREATE INDEX "PartnerDestination_partnerId_idx" ON "PartnerDestination"("partnerId");
CREATE INDEX "PartnerDestination_status_idx" ON "PartnerDestination"("status");
CREATE INDEX "PartnerDestination_partnerId_isDefault_idx" ON "PartnerDestination"("partnerId", "isDefault");
CREATE INDEX "PartnerDestination_createdAt_idx" ON "PartnerDestination"("createdAt");
CREATE INDEX "AcquisitionAttribution_partnerDestinationId_idx" ON "AcquisitionAttribution"("partnerDestinationId");
CREATE INDEX "AcquisitionAttribution_partnerDestinationSlug_idx" ON "AcquisitionAttribution"("partnerDestinationSlug");

ALTER TABLE "PartnerDestination"
ADD CONSTRAINT "PartnerDestination_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcquisitionAttribution"
ADD CONSTRAINT "AcquisitionAttribution_partnerDestinationId_fkey"
FOREIGN KEY ("partnerDestinationId") REFERENCES "PartnerDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
