import { cookies } from "next/headers";

export const acquisitionCookieNames = {
  source: "jakawi_acq_source",
  referrerStoreId: "jakawi_referrer_store_id",
  partnerId: "jakawi_partner_id",
  partnerDestination: "jakawi_partner_destination",
  partnerDestinationId: "jakawi_partner_destination_id",
  referralCode: "jakawi_referral_code",
  landingPath: "jakawi_acq_landing_path",
} as const;

const acquisitionCookieMaxAge = 30 * 24 * 60 * 60;

export function getReferralCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: acquisitionCookieMaxAge,
    path: "/",
  };
}

export async function clearAcquisitionCookies() {
  const cookieStore = await cookies();
  Object.values(acquisitionCookieNames).forEach((name) => cookieStore.delete(name));
}
