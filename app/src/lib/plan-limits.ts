import { getStorefrontFlow } from "@/lib/storefront-flow";

export function getProductLimit(planCode: string | null | undefined) {
  return getStorefrontFlow(planCode).productLimit;
}

export function canCreateMoreProducts(planCode: string | null | undefined, currentCount: number) {
  return currentCount < getProductLimit(planCode);
}
