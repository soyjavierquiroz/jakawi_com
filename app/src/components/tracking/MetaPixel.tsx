"use client";

import Script from "next/script";
import type { MetaPixelEvent } from "@/lib/pixels/meta-pixel";

type MetaPixelProps = {
  pixelId: string;
  event: MetaPixelEvent;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function MetaPixel({ pixelId, event }: MetaPixelProps) {
  if (!pixelId || !event.eventId) return null;

  const eventKey = `${pixelId}:${event.eventName}:${event.eventId}`;
  const script = `
    window.__jakawiMetaPixelIds = window.__jakawiMetaPixelIds || {};
    window.__jakawiMetaPixelEvents = window.__jakawiMetaPixelEvents || {};
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];}(window, document, 'script');
    if (!window.__jakawiMetaPixelIds[${safeJson(pixelId)}]) {
      window.fbq('init', ${safeJson(pixelId)});
      window.__jakawiMetaPixelIds[${safeJson(pixelId)}] = true;
    }
    if (!window.__jakawiMetaPixelEvents[${safeJson(eventKey)}]) {
      window.fbq('track', ${safeJson(event.eventName)}, ${safeJson(event.params)}, { eventID: ${safeJson(event.eventId)} });
      window.__jakawiMetaPixelEvents[${safeJson(eventKey)}] = true;
    }
  `;

  return (
    <>
      <Script id={`meta-pixel-loader-${pixelId}`} src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      <Script id={`meta-pixel-event-${event.eventId}`} strategy="afterInteractive">
        {script}
      </Script>
    </>
  );
}
