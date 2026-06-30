ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "featuredAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Product_storeId_isFeatured_idx" ON "Product"("storeId", "isFeatured");
CREATE INDEX "Product_storeId_sortOrder_idx" ON "Product"("storeId", "sortOrder");
