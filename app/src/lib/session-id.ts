"use client";

const sessionKey = "jakawi_visitor_session";

function createSessionId() {
  const random = crypto.getRandomValues(new Uint8Array(12));
  const value = Array.from(random, (byte) => byte.toString(36).padStart(2, "0")).join("");
  return `jkw_${Date.now().toString(36)}_${value.slice(0, 18)}`;
}

export function getVisitorSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(sessionKey) || document.cookie.match(/(?:^|; )jakawi_visitor_session=([^;]+)/)?.[1];
  if (existing) {
    const decoded = decodeURIComponent(existing);
    window.localStorage.setItem(sessionKey, decoded);
    return decoded;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(sessionKey, sessionId);
  document.cookie = `${sessionKey}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return sessionId;
}
