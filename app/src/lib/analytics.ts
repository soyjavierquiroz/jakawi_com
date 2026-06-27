import { headers } from "next/headers";
import { createHash } from "crypto";
import { AnalyticsEventType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

function hashIp(ip: string | null) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function trackEvent(type: AnalyticsEventType, storeId: string, productId?: string) {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent");

  await getPrisma().analyticsEvent.create({
    data: {
      type,
      storeId,
      productId,
      ipHash: hashIp(forwarded),
      userAgent,
    },
  });
}
