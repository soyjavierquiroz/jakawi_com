"use client";

import Script from "next/script";
import type { TikTokPixelEvent } from "@/lib/pixels/tiktok-pixel";

type TikTokPixelProps = {
  pixelId: string;
  event: TikTokPixelEvent;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildTikTokEventCall(event: TikTokPixelEvent) {
  const options = { event_id: event.eventId };
  if (event.eventName === "PageView") {
    return `window.ttq.page(${safeJson(options)});`;
  }

  return `window.ttq.track(${safeJson(event.eventName)}, ${safeJson(event.params)}, ${safeJson(options)});`;
}

export function TikTokPixel({ pixelId, event }: TikTokPixelProps) {
  if (!pixelId || !event.eventId) return null;

  const eventKey = `${pixelId}:${event.eventName}:${event.eventId}`;
  const script = `
    window.__jakawiTikTokPixelIds = window.__jakawiTikTokPixelIds || {};
    window.__jakawiTikTokPixelEvents = window.__jakawiTikTokPixelEvents || {};
    !function(w,d,t){
      w.TiktokAnalyticsObject=t;
      var ttq=w[t]=w[t]||[];
      ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      ttq.setAndDefer=function(target, method){target[method]=function(){target.push([method].concat(Array.prototype.slice.call(arguments,0)));};};
      for(var i=0;i<ttq.methods.length;i++){ttq.setAndDefer(ttq,ttq.methods[i]);}
      ttq.instance=function(name){var instance=ttq._i[name]||[];for(var i=0;i<ttq.methods.length;i++){ttq.setAndDefer(instance,ttq.methods[i]);}return instance;};
      ttq.load=function(id){
        if (window.__jakawiTikTokPixelIds[id]) return;
        ttq._i=ttq._i||{};ttq._i[id]=[];ttq._i[id]._u='https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._t=ttq._t||{};ttq._t[id]=+new Date;ttq._o=ttq._o||{};ttq._o[id]={};
        var script=d.createElement('script');script.type='text/javascript';script.async=true;script.src='https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='+id+'&lib='+t;
        var first=d.getElementsByTagName('script')[0];first.parentNode.insertBefore(script,first);
        window.__jakawiTikTokPixelIds[id] = true;
      };
    }(window, document, 'ttq');
    window.ttq.load(${safeJson(pixelId)});
    if (!window.__jakawiTikTokPixelEvents[${safeJson(eventKey)}]) {
      ${buildTikTokEventCall(event)}
      window.__jakawiTikTokPixelEvents[${safeJson(eventKey)}] = true;
    }
  `;

  return (
    <Script id={`tiktok-pixel-event-${event.eventId}`} strategy="afterInteractive">
      {script}
    </Script>
  );
}
