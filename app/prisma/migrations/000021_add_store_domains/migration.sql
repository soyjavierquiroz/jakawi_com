-- Add manual multi-domain foundation for storefront resolution.
-- This does not provision DNS, Cloudflare custom hostnames, pixels, CAPI, CRM, or self-service owner flows.

CREATE TYPE "StoreDomainType" AS ENUM ('JAKAWI_SLUG', 'JAKAWI_SUBDOMAIN', 'CUSTOM_DOMAIN');
CREATE TYPE "StoreDomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'ACTIVE', 'FAILED', 'DISABLED');
CREATE TYPE "StoreDomainVerificationType" AS ENUM ('NONE', 'DNS_TXT', 'DNS_CNAME', 'MANUAL');

CREATE TABLE "StoreDomain" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" "StoreDomainType" NOT NULL,
    "status" "StoreDomainStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationType" "StoreDomainVerificationType" NOT NULL DEFAULT 'NONE',
    "verificationValue" TEXT,
    "cloudflareHostnameId" TEXT,
    "sslStatus" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreDomain_hostname_key" ON "StoreDomain"("hostname");
CREATE INDEX "StoreDomain_storeId_idx" ON "StoreDomain"("storeId");
CREATE INDEX "StoreDomain_storeId_isPrimary_idx" ON "StoreDomain"("storeId", "isPrimary");
CREATE INDEX "StoreDomain_status_idx" ON "StoreDomain"("status");

ALTER TABLE "StoreDomain"
ADD CONSTRAINT "StoreDomain_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
