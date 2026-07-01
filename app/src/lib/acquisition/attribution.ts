import { cookies } from "next/headers";
import { acquisitionCookieNames } from "@/lib/acquisition/cookies";
import { getPrisma } from "@/lib/prisma";

type CreateAttributionForStoreParams = {
  storeId: string;
  userId: string;
};

type AttributionInput = {
  sourceType: "ORGANIC" | "STORE_REFERRAL" | "PARTNER" | "MANUAL";
  referrerStoreId?: string;
  partnerId?: string;
  code?: string;
  landingPath?: string;
  notes?: string;
};

function cleanCookieValue(value: string | undefined) {
  const cleanValue = value?.trim() ?? "";
  return cleanValue.length ? cleanValue : undefined;
}

export async function createAttributionForStore({ storeId, userId }: CreateAttributionForStoreParams) {
  const cookieStore = await cookies();
  const source = cleanCookieValue(cookieStore.get(acquisitionCookieNames.source)?.value);
  const code = cleanCookieValue(cookieStore.get(acquisitionCookieNames.referralCode)?.value);
  const landingPath = cleanCookieValue(cookieStore.get(acquisitionCookieNames.landingPath)?.value);

  let attribution: AttributionInput = {
    sourceType: "ORGANIC",
    code,
    landingPath,
  };

  if (source === "PARTNER") {
    const partnerId = cleanCookieValue(cookieStore.get(acquisitionCookieNames.partnerId)?.value);
    const partner = partnerId
      ? await getPrisma().partner.findFirst({
          where: { id: partnerId, status: "ACTIVE" },
          select: { id: true, code: true },
        })
      : null;

    if (partner) {
      attribution = {
        sourceType: "PARTNER",
        partnerId: partner.id,
        code: code ?? partner.code,
        landingPath,
      };
    } else {
      attribution.notes = "Partner attribution cookie was invalid or inactive at signup.";
    }
  } else if (source === "STORE_REFERRAL") {
    const referrerStoreId = cleanCookieValue(cookieStore.get(acquisitionCookieNames.referrerStoreId)?.value);
    const referrerStore = referrerStoreId
      ? await getPrisma().store.findUnique({
          where: { id: referrerStoreId },
          select: { id: true, ownerId: true, slug: true },
        })
      : null;

    if (referrerStore && referrerStore.id !== storeId && referrerStore.ownerId !== userId) {
      attribution = {
        sourceType: "STORE_REFERRAL",
        referrerStoreId: referrerStore.id,
        code: code ?? referrerStore.slug,
        landingPath,
      };
    } else if (referrerStore) {
      attribution.notes = "Self-referral ignored at signup.";
    } else {
      attribution.notes = "Store referral cookie was invalid at signup.";
    }
  }

  return getPrisma().acquisitionAttribution.create({
    data: {
      storeId,
      userId,
      sourceType: attribution.sourceType,
      status: "SIGNED_UP",
      referrerStoreId: attribution.referrerStoreId,
      partnerId: attribution.partnerId,
      code: attribution.code,
      landingPath: attribution.landingPath,
      notes: attribution.notes,
      firstSeenAt: attribution.sourceType === "ORGANIC" ? null : new Date(),
    },
  });
}
