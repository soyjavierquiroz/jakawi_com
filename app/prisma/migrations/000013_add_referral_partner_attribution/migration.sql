CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "commissionRateBps" INTEGER NOT NULL DEFAULT 2000,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcquisitionAttribution" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT,
  "sourceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SIGNED_UP',
  "referrerStoreId" TEXT,
  "partnerId" TEXT,
  "code" TEXT,
  "landingPath" TEXT,
  "notes" TEXT,
  "firstSeenAt" TIMESTAMP(3),
  "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AcquisitionAttribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_code_key" ON "Partner"("code");
CREATE INDEX "Partner_status_idx" ON "Partner"("status");
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

CREATE UNIQUE INDEX "AcquisitionAttribution_storeId_key" ON "AcquisitionAttribution"("storeId");
CREATE INDEX "AcquisitionAttribution_sourceType_idx" ON "AcquisitionAttribution"("sourceType");
CREATE INDEX "AcquisitionAttribution_status_idx" ON "AcquisitionAttribution"("status");
CREATE INDEX "AcquisitionAttribution_referrerStoreId_idx" ON "AcquisitionAttribution"("referrerStoreId");
CREATE INDEX "AcquisitionAttribution_partnerId_idx" ON "AcquisitionAttribution"("partnerId");
CREATE INDEX "AcquisitionAttribution_userId_idx" ON "AcquisitionAttribution"("userId");
CREATE INDEX "AcquisitionAttribution_code_idx" ON "AcquisitionAttribution"("code");
CREATE INDEX "AcquisitionAttribution_createdAt_idx" ON "AcquisitionAttribution"("createdAt");

ALTER TABLE "AcquisitionAttribution" ADD CONSTRAINT "AcquisitionAttribution_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcquisitionAttribution" ADD CONSTRAINT "AcquisitionAttribution_referrerStoreId_fkey" FOREIGN KEY ("referrerStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcquisitionAttribution" ADD CONSTRAINT "AcquisitionAttribution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcquisitionAttribution" ADD CONSTRAINT "AcquisitionAttribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
