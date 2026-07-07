CREATE TYPE "StorePixelPlatform" AS ENUM ('META', 'TIKTOK', 'GOOGLE');

CREATE TYPE "StorePixelStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'ERROR');

CREATE TABLE "StorePixelIntegration" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" "StorePixelPlatform" NOT NULL,
    "pixelId" TEXT,
    "accessTokenEncrypted" TEXT,
    "capiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "browserPixelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "testEventCode" TEXT,
    "status" "StorePixelStatus" NOT NULL DEFAULT 'DRAFT',
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePixelIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorePixelIntegration_storeId_platform_key" ON "StorePixelIntegration"("storeId", "platform");
CREATE INDEX "StorePixelIntegration_storeId_idx" ON "StorePixelIntegration"("storeId");
CREATE INDEX "StorePixelIntegration_platform_idx" ON "StorePixelIntegration"("platform");
CREATE INDEX "StorePixelIntegration_status_idx" ON "StorePixelIntegration"("status");

ALTER TABLE "StorePixelIntegration" ADD CONSTRAINT "StorePixelIntegration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
