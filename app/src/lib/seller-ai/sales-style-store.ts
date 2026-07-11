import { isSellerAiSalesStyle, type SellerAiSalesStyle } from "@/lib/seller-ai/seller-ai";

type SalesStyleStoreDb = {
  store: {
    updateMany: (args: {
      where: { id: string; ownerId: string };
      data: { sellerAiSalesStyle: SellerAiSalesStyle };
    }) => Promise<{ count: number }>;
  };
};

export async function updateSellerAiSalesStyleForOwner({
  db,
  ownerId,
  storeId,
  style,
}: {
  db: SalesStyleStoreDb;
  ownerId: string;
  storeId: string;
  style: string;
}) {
  if (!isSellerAiSalesStyle(style)) return { ok: false as const, reason: "invalid-style" as const };

  const updated = await db.store.updateMany({
    where: { id: storeId, ownerId },
    data: { sellerAiSalesStyle: style },
  });

  return updated.count === 1 ? { ok: true as const, style } : { ok: false as const, reason: "store-not-owned" as const };
}
