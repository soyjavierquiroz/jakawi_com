-- Add manual store payment ledger. This does not execute charges, change plans, or create automatic commissions/rewards.

CREATE TABLE "StorePayment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "planKey" TEXT,
    "paymentType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "externalReference" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "cancelledByUserId" TEXT,
    "refundedByUserId" TEXT,

    CONSTRAINT "StorePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorePayment_storeId_idx" ON "StorePayment"("storeId");
CREATE INDEX "StorePayment_status_idx" ON "StorePayment"("status");
CREATE INDEX "StorePayment_planKey_idx" ON "StorePayment"("planKey");
CREATE INDEX "StorePayment_paymentType_idx" ON "StorePayment"("paymentType");
CREATE INDEX "StorePayment_paidAt_idx" ON "StorePayment"("paidAt");
CREATE INDEX "StorePayment_confirmedAt_idx" ON "StorePayment"("confirmedAt");
CREATE INDEX "StorePayment_createdAt_idx" ON "StorePayment"("createdAt");
CREATE INDEX "StorePayment_storeId_createdAt_idx" ON "StorePayment"("storeId", "createdAt");
CREATE INDEX "StorePayment_status_createdAt_idx" ON "StorePayment"("status", "createdAt");

ALTER TABLE "StorePayment"
ADD CONSTRAINT "StorePayment_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
