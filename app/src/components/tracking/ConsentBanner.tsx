"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2, ShieldCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  getDefaultConsent,
  necessaryOnlyTrackingConsent,
  parseTrackingConsentCookie,
  serializeTrackingConsent,
  trackingConsentCookieName,
  type TrackingConsent,
} from "@/lib/tracking/consent";
import { shouldShowPrivacyFloatingButton } from "@/lib/tracking/privacy-button-scope";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 180;

type ConsentBannerState = {
  isReady: boolean;
  isOpen: boolean;
  hasStoredConsent: boolean;
  preferences: TrackingConsent;
};

function cookieAttributes() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; Max-Age=${cookieMaxAgeSeconds}; SameSite=Lax${secure}`;
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function readStoredConsent() {
  const raw = readCookie(trackingConsentCookieName);
  if (!raw) return null;

  try {
    return parseTrackingConsentCookie(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function writeStoredConsent(consent: Partial<TrackingConsent>) {
  document.cookie = `${trackingConsentCookieName}=${encodeURIComponent(serializeTrackingConsent(consent))}; ${cookieAttributes()}`;
}

export function ConsentBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<ConsentBannerState>(() => ({
    isReady: false,
    isOpen: false,
    hasStoredConsent: false,
    preferences: getDefaultConsent(),
  }));
  const { isReady, isOpen, hasStoredConsent, preferences } = state;
  const showFloatingButton = shouldShowPrivacyFloatingButton(pathname);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = readStoredConsent();
      setState({
        isReady: true,
        isOpen: !stored,
        hasStoredConsent: Boolean(stored),
        preferences: stored ?? getDefaultConsent(),
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const statusLabel = useMemo(() => {
    if (preferences.marketing) return "Todo activado";
    if (preferences.analytics) return "Analitica activada";
    return "Solo necesarias";
  }, [preferences.analytics, preferences.marketing]);

  function save(consent: Partial<TrackingConsent>) {
    writeStoredConsent(consent);
    const stored = readStoredConsent();
    setState({
      isReady: true,
      isOpen: false,
      hasStoredConsent: true,
      preferences: stored ?? getDefaultConsent(),
    });
  }

  if (!isReady) return null;

  return (
    <>
      {hasStoredConsent && !isOpen && showFloatingButton ? (
        <button
          type="button"
          onClick={() => setState((current) => ({ ...current, isOpen: true }))}
          className="privacy-floating-preferences-button fixed bottom-3 left-3 z-50 inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 text-xs font-black text-neutral-900 shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-brand/20"
          aria-label="Cambiar preferencias de privacidad"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          Privacidad
        </button>
      ) : null}

      {isOpen ? (
        <section
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-lg border border-black/10 bg-white p-4 text-neutral-950 shadow-2xl sm:bottom-5 sm:p-5"
          aria-label="Preferencias de consentimiento"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-black">
                <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
                Consentimiento de tracking
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
                Usamos cookies first-party para medir visitas y, solo si lo autorizas, activar marketing como Meta Pixel/CAPI.
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">{statusLabel}</p>
            </div>

            {hasStoredConsent ? (
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, isOpen: false }))}
                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-4 focus:ring-brand/20"
                aria-label="Cerrar preferencias"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex min-h-20 items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <input type="checkbox" checked readOnly className="mt-1 size-4 accent-brand" />
              <span>
                <span className="block text-sm font-black">Necesarias</span>
                <span className="mt-1 block text-xs leading-5 text-neutral-600">Siempre activas para que el sitio funcione.</span>
              </span>
            </label>
            <label className="flex min-h-20 items-start gap-3 rounded-md border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    preferences: {
                      ...current.preferences,
                      analytics: event.target.checked,
                    },
                  }))
                }
                className="mt-1 size-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-black">Analytics</span>
                <span className="mt-1 block text-xs leading-5 text-neutral-600">Medicion first-party de visitas y conversiones.</span>
              </span>
            </label>
            <label className="flex min-h-20 items-start gap-3 rounded-md border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    preferences: {
                      ...current.preferences,
                      marketing: event.target.checked,
                    },
                  }))
                }
                className="mt-1 size-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-black">Marketing</span>
                <span className="mt-1 block text-xs leading-5 text-neutral-600">Opt-in explicito para Meta Pixel y CAPI.</span>
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => save(necessaryOnlyTrackingConsent)}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-black text-neutral-800 transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-brand/20"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={() => save({ necessary: true, analytics: true, marketing: false })}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-black text-neutral-800 transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-brand/20"
            >
              Aceptar analytics
            </button>
            <button
              type="button"
              onClick={() => save({ necessary: true, analytics: preferences.analytics, marketing: true })}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-black text-neutral-800 transition hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-brand/20"
            >
              Aceptar marketing
            </button>
            <button
              type="button"
              onClick={() => save(preferences)}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand bg-brand px-4 text-sm font-black text-white transition hover:bg-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/20"
            >
              Guardar preferencias
            </button>
            <button
              type="button"
              onClick={() => save({ necessary: true, analytics: true, marketing: true })}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-black text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-brand/20"
            >
              Aceptar todo
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
