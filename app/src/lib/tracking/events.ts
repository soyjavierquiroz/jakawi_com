export const trackingScopes = ["PLATFORM", "STORE"] as const;
export type TrackingScope = (typeof trackingScopes)[number];

export const platformTrackingEvents = [
  "jakawi_landing_view",
  "jakawi_signup_started",
  "jakawi_owner_registered",
  "jakawi_store_created",
  "jakawi_trial_started",
  "jakawi_payment_pending",
  "jakawi_payment_confirmed",
  "jakawi_partner_click",
  "jakawi_partner_signup",
] as const;

export const storeTrackingEvents = [
  "store_view",
  "product_view",
  "seller_ai_opened",
  "seller_ai_message",
  "seller_ai_handoff",
  "whatsapp_click",
  "lead_created",
  "contactable_lead",
  "high_intent_signal",
] as const;

export type PlatformTrackingEventName = (typeof platformTrackingEvents)[number];
export type StoreTrackingEventName = (typeof storeTrackingEvents)[number];
export type TrackingEventName = PlatformTrackingEventName | StoreTrackingEventName;

const platformEventSet = new Set<string>(platformTrackingEvents);
const storeEventSet = new Set<string>(storeTrackingEvents);

export function isPlatformTrackingEvent(eventName: string): eventName is PlatformTrackingEventName {
  return platformEventSet.has(eventName);
}

export function isStoreTrackingEvent(eventName: string): eventName is StoreTrackingEventName {
  return storeEventSet.has(eventName);
}

export function isEventAllowedForScope(scope: TrackingScope, eventName: TrackingEventName) {
  if (scope === "PLATFORM") return isPlatformTrackingEvent(eventName);
  return isStoreTrackingEvent(eventName);
}

export function analyticsEventNameForLegacyType(type: "STORE_VIEW" | "PRODUCT_VIEW" | "WHATSAPP_CLICK"): StoreTrackingEventName {
  if (type === "PRODUCT_VIEW") return "product_view";
  if (type === "WHATSAPP_CLICK") return "whatsapp_click";
  return "store_view";
}
