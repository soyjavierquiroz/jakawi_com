-- Add manual store referral reward ledger. This does not apply billing, credits, plans, or automatic rewards.

CREATE TABLE "StoreReferralReward" (
    "id" TEXT NOT NULL,
    "referrerStoreId" TEXT NOT NULL,
    "referredStoreId" TEXT,
    "attributionId" TEXT,
    "rewardType" TEXT NOT NULL,
    "valueLabel" TEXT,
    "valueAmountCents" INTEGER,
    "currency" TEXT,
    "sellerAiCredits" INTEGER,
    "months" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "notes" TEXT,
    "applicationReference" TEXT,
    "earnedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "appliedByUserId" TEXT,
    "cancelledByUserId" TEXT,

    CONSTRAINT "StoreReferralReward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreReferralReward_referrerStoreId_idx" ON "StoreReferralReward"("referrerStoreId");
CREATE INDEX "StoreReferralReward_referredStoreId_idx" ON "StoreReferralReward"("referredStoreId");
CREATE INDEX "StoreReferralReward_attributionId_idx" ON "StoreReferralReward"("attributionId");
CREATE INDEX "StoreReferralReward_rewardType_idx" ON "StoreReferralReward"("rewardType");
CREATE INDEX "StoreReferralReward_status_idx" ON "StoreReferralReward"("status");
CREATE INDEX "StoreReferralReward_createdAt_idx" ON "StoreReferralReward"("createdAt");
CREATE INDEX "StoreReferralReward_appliedAt_idx" ON "StoreReferralReward"("appliedAt");

ALTER TABLE "StoreReferralReward"
ADD CONSTRAINT "StoreReferralReward_referrerStoreId_fkey"
FOREIGN KEY ("referrerStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreReferralReward"
ADD CONSTRAINT "StoreReferralReward_referredStoreId_fkey"
FOREIGN KEY ("referredStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoreReferralReward"
ADD CONSTRAINT "StoreReferralReward_attributionId_fkey"
FOREIGN KEY ("attributionId") REFERENCES "AcquisitionAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
