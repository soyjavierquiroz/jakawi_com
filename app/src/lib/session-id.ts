"use client";

const sessionKey = "jakawi_visitor_session";
const visitorKey = "jakawi_visitor_id";
const journeyKey = "jakawi_journey_id";

function createSessionId() {
  const random = crypto.getRandomValues(new Uint8Array(12));
  const value = Array.from(random, (byte) => byte.toString(36).padStart(2, "0")).join("");
  return `jkw_${Date.now().toString(36)}_${value.slice(0, 18)}`;
}

export function getVisitorSessionId() {
  if (typeof window === "undefined") return "";

  const cookieVisitor = document.cookie.match(/(?:^|; )jakawi_visitor_id=([^;]+)/)?.[1];
  const cookieSession = document.cookie.match(/(?:^|; )jakawi_visitor_session=([^;]+)/)?.[1];
  const cookieJourney = document.cookie.match(/(?:^|; )jakawi_journey_id=([^;]+)/)?.[1];
  const existing = window.localStorage.getItem(visitorKey) || window.localStorage.getItem(sessionKey) || cookieVisitor || cookieSession;
  if (existing) {
    const decoded = decodeURIComponent(existing);
    window.localStorage.setItem(visitorKey, decoded);
    window.localStorage.setItem(sessionKey, decoded);
    document.cookie = `${visitorKey}=${encodeURIComponent(decoded)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (!cookieJourney) document.cookie = `${journeyKey}=${encodeURIComponent(decoded)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    return decoded;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(visitorKey, sessionId);
  window.localStorage.setItem(sessionKey, sessionId);
  document.cookie = `${sessionKey}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `${visitorKey}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `${journeyKey}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  return sessionId;
}
