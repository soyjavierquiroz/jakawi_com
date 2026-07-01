-- Link an existing User to a Partner for read-only partner portal access.

ALTER TABLE "Partner" ADD COLUMN "portalUserId" TEXT;

CREATE UNIQUE INDEX "Partner_portalUserId_key" ON "Partner"("portalUserId");

ALTER TABLE "Partner"
ADD CONSTRAINT "Partner_portalUserId_fkey"
FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
