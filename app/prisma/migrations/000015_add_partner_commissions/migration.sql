-- Add manual partner commission ledger. This does not create payouts or automatic commissions.

CREATE TABLE "PartnerCommission" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "storeId" TEXT,
    "attributionId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "basisAmountCents" INTEGER,
    "commissionAmountCents" INTEGER NOT NULL,
    "commissionRateBps" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "notes" TEXT,
    "paymentReference" TEXT,
    "earnedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "paidByUserId" TEXT,
    "cancelledByUserId" TEXT,
    "reversedByUserId" TEXT,

    CONSTRAINT "PartnerCommission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerCommission_partnerId_idx" ON "PartnerCommission"("partnerId");
CREATE INDEX "PartnerCommission_storeId_idx" ON "PartnerCommission"("storeId");
CREATE INDEX "PartnerCommission_attributionId_idx" ON "PartnerCommission"("attributionId");
CREATE INDEX "PartnerCommission_status_idx" ON "PartnerCommission"("status");
CREATE INDEX "PartnerCommission_createdAt_idx" ON "PartnerCommission"("createdAt");
CREATE INDEX "PartnerCommission_paidAt_idx" ON "PartnerCommission"("paidAt");

ALTER TABLE "PartnerCommission"
ADD CONSTRAINT "PartnerCommission_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerCommission"
ADD CONSTRAINT "PartnerCommission_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerCommission"
ADD CONSTRAINT "PartnerCommission_attributionId_fkey"
FOREIGN KEY ("attributionId") REFERENCES "AcquisitionAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
