"use client";

import { ArrowLeft, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartPhoneInput } from "@/components/forms/SmartPhoneInput";
import { sellerAiConfig } from "@/config/seller-ai";
import { getVisitorSessionId } from "@/lib/session-id";
import type { SellerAiMode } from "@/lib/storefront-flow";
import { cn } from "@/lib/ui";
import { TypingIndicator } from "./TypingIndicator";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type WidgetStep = "closed" | "chat" | "phone_capture" | "redirecting";

type SellerAiWidgetProps = {
  storeSlug: string;
  storeName: string;
  productId?: string;
  productName?: string;
  categoryName?: string | null;
  whatsapp?: string;
  planCode?: string | null;
  mode?: SellerAiMode;
  requirePhoneBeforeWhatsapp?: boolean;
  initiallyHidden?: boolean;
  triggerLabel?: string;
};

type SellerAiOpenEvent = CustomEvent<{
  productId?: string;
  productName?: string;
  action?: "chat" | "whatsapp";
}>;

function messageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function assistantTypingDelay() {
  const minDelay = sellerAiConfig.typing.minDelayMs;
  const maxDelay = Math.max(minDelay, sellerAiConfig.typing.maxDelayMs);
  return minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
}

function hasStrongIntent(input: string) {
  return /quiero|me interesa|comprar|precio|disponible|disponibilidad|pedido|lo llevo|cómo compro|como compro/i.test(input);
}

export function SellerAiWidget({
  storeSlug,
  storeName,
  productId,
  productName,
  categoryName,
  mode = "assistive",
  requirePhoneBeforeWhatsapp = true,
  initiallyHidden = false,
  triggerLabel,
}: SellerAiWidgetProps) {
  const widgetCopy = sellerAiConfig.widget;
  const phoneCaptureCopy = sellerAiConfig.phoneCapture[mode === "premium" ? "premium" : mode === "guided" ? "guided" : "assistive"];
  const closedLabel = triggerLabel ?? (mode === "premium" ? widgetCopy.premiumClosedLabel : widgetCopy.closedLabel);
  const widgetTitle = mode === "premium" ? "Seller AI Premium" : widgetCopy.title;
  const [sessionId] = useState(() => (typeof window === "undefined" ? "" : getVisitorSessionId()));
  const [step, setStep] = useState<WidgetStep>("closed");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadCode, setLeadCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>(sellerAiConfig.quickReplies.default);
  const [input, setInput] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneIsValid, setCustomerPhoneIsValid] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [shouldShowWhatsappCta, setShouldShowWhatsappCta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [manualWhatsappUrl, setManualWhatsappUrl] = useState<string | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openedRef = useRef(false);

  const isClosed = step === "closed";
  const chatIsBusy = isLoading || isAssistantTyping;
  const ctaIsStrong = shouldShowWhatsappCta;
  const showWhatsappCta = step === "chat" && messages.length > 0;

  const teaserText = useMemo(() => {
    const text = `${productName ?? ""} ${categoryName ?? ""}`.toLowerCase();
    if (/termo|thermo|vaso/.test(text)) return widgetCopy.closedTeasers.termo;
    if (/aud[ií]fono|auricular|headphone/.test(text)) return widgetCopy.closedTeasers.audifonos;
    if (/mochila|bolso/.test(text)) return widgetCopy.closedTeasers.mochila;
    return widgetCopy.closedTeaserDefault;
  }, [categoryName, productName, widgetCopy.closedTeaserDefault, widgetCopy.closedTeasers.audifonos, widgetCopy.closedTeasers.mochila, widgetCopy.closedTeasers.termo]);

  useEffect(() => {
    if (!sellerAiConfig.enabled || !sessionId) return;

    if (productId) {
      void postJson("/api/seller-ai/events", {
        sessionId,
        storeSlug,
        eventType: "PRODUCT_VIEW",
        productId,
        metadata: { productName, categoryName },
      }).catch(() => undefined);
    }
  }, [categoryName, productId, productName, sessionId, storeSlug]);

  useEffect(() => {
    if (!sellerAiConfig.enabled || !isClosed || hasInteracted) return;
    const timer = window.setTimeout(() => setShowTeaser(true), sellerAiConfig.activationDelayMs);
    return () => window.clearTimeout(timer);
  }, [hasInteracted, isClosed]);

  useEffect(() => {
    if (!sellerAiConfig.enabled || !isClosed || hasInteracted || nudgeCount >= sellerAiConfig.nudgeMaxCount) return;
    const delay = nudgeCount === 0 ? sellerAiConfig.nudgeDelayMs : sellerAiConfig.nudgeRepeatMs;
    const timer = window.setTimeout(() => {
      setIsNudging(true);
      setNudgeCount((current) => current + 1);
      window.setTimeout(() => setIsNudging(false), 950);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [hasInteracted, isClosed, nudgeCount]);

  useEffect(() => {
    if (step === "closed") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [step]);

  useEffect(() => {
    if (step === "closed") return;
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, isAssistantTyping, isLoading, messages.length, phoneError, quickReplies.length, redirectError, shouldShowWhatsappCta, step]);

  const openChat = useCallback(async (options?: { afterOpen?: WidgetStep }) => {
    setHasInteracted(true);
    setShowTeaser(false);
    setStep("chat");
    if (!sessionId) return null;
    if (openedRef.current) {
      if (options?.afterOpen) setStep(options.afterOpen);
      return leadId;
    }
    openedRef.current = true;
    setIsLoading(true);
    if (messages.length === 0) setIsAssistantTyping(true);
    setError(null);
    let nextLeadId: string | null = null;
    const openingDelay = messages.length === 0 ? wait(sellerAiConfig.typing.openingDelayMs) : Promise.resolve();

    try {
      await postJson("/api/seller-ai/events", {
        sessionId,
        storeSlug,
        eventType: "CHAT_OPENED",
        productId,
      });

      if (productId) {
        const openingPromise = postJson<{
          leadId: string;
          leadCode: string;
          message: string;
          quickReplies: string[];
        }>("/api/seller-ai/opening", { sessionId, storeSlug, productId });
        const [opening] = await Promise.all([openingPromise, openingDelay]);
        setLeadId(opening.leadId);
        nextLeadId = opening.leadId;
        setLeadCode(opening.leadCode);
        setMessages([{ id: messageId(), role: "assistant", content: opening.message }]);
        setQuickReplies(opening.quickReplies);
      } else {
        const leadPromise = postJson<{ leadId: string; leadCode: string }>("/api/seller-ai/lead", {
          sessionId,
          storeSlug,
          source: "store_page",
        });
        const [lead] = await Promise.all([leadPromise, openingDelay]);
        setLeadId(lead.leadId);
        nextLeadId = lead.leadId;
        setLeadCode(lead.leadCode);
        setMessages([
          {
            id: messageId(),
            role: "assistant",
            content: sellerAiConfig.categoryTemplates.default.replace("{productName}", storeName),
          },
        ]);
      }
      if (options?.afterOpen && nextLeadId) setStep(options.afterOpen);
      return nextLeadId;
    } catch {
      setError("No pude cargar el vendedor ahora. Puedes intentar continuar por WhatsApp.");
      openedRef.current = false;
      return null;
    } finally {
      setIsAssistantTyping(false);
      setIsLoading(false);
    }
  }, [leadId, messages.length, productId, sessionId, storeName, storeSlug]);

  const closeWidget = useCallback(() => {
    setHasInteracted(true);
    setShowTeaser(false);
    setStep("closed");
  }, []);

  const sendMessage = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (!clean || !leadId) return;
      setInput("");
      setMessages((current) => [...current, { id: messageId(), role: "user", content: clean }]);
      setIsLoading(true);
      setIsAssistantTyping(true);
      setError(null);
      if (hasStrongIntent(clean)) setShouldShowWhatsappCta(true);
      const typingDelay = assistantTypingDelay();
      const startedAt = Date.now();

      try {
        const response = await postJson<{
          assistantMessage: string;
          quickReplies: string[];
          shouldShowWhatsappCta: boolean;
        }>("/api/seller-ai/chat", { leadId, message: clean, currentProductId: productId });
        await wait(Math.max(0, typingDelay - (Date.now() - startedAt)));
        setIsAssistantTyping(false);
        setMessages((current) => [...current, { id: messageId(), role: "assistant", content: response.assistantMessage }]);
        setQuickReplies(response.quickReplies);
        setShouldShowWhatsappCta((current) => current || response.shouldShowWhatsappCta);
      } catch {
        await wait(Math.max(0, typingDelay - (Date.now() - startedAt)));
        setIsAssistantTyping(false);
        setError("No pude responder eso ahora. La tienda puede confirmarlo por WhatsApp.");
        setShouldShowWhatsappCta(true);
      } finally {
        setIsLoading(false);
      }
    },
    [leadId, productId],
  );

  const continueWhatsapp = useCallback(async () => {
    if (!leadId) return;
    const shouldValidatePhone = requirePhoneBeforeWhatsapp || customerPhone.trim().length > 0;
    const normalizedPhone = shouldValidatePhone ? customerPhone.trim() : undefined;
    if (shouldValidatePhone && (!normalizedPhone || !customerPhoneIsValid)) {
      setPhoneError(widgetCopy.phoneInvalidError);
      return;
    }

    setPhoneError(null);
    setError(null);
    setRedirectError(null);
    setStep("redirecting");
    setIsLoading(true);

    try {
      const response = await postJson<{ whatsappUrl: string }>("/api/seller-ai/continue-whatsapp", {
        leadId,
        selectedProductId: productId,
        customerPhone: normalizedPhone,
        customerName: customerName.trim() || undefined,
      });
      setManualWhatsappUrl(response.whatsappUrl);
      window.location.href = response.whatsappUrl;
      window.setTimeout(() => {
        setRedirectError(widgetCopy.redirectFailed);
        setIsLoading(false);
      }, 1400);
    } catch {
      setRedirectError(widgetCopy.redirectFailed);
      setStep("phone_capture");
      setIsLoading(false);
    }
  }, [customerName, customerPhone, customerPhoneIsValid, leadId, productId, requirePhoneBeforeWhatsapp, widgetCopy.phoneInvalidError, widgetCopy.redirectFailed]);

  const requestWhatsappStep = useCallback(async () => {
    setError(null);
    setRedirectError(null);
    if (!leadId) {
      await openChat({ afterOpen: requirePhoneBeforeWhatsapp ? "phone_capture" : "chat" });
      return;
    }
    if (requirePhoneBeforeWhatsapp) {
      setStep("phone_capture");
      return;
    }
    await continueWhatsapp();
  }, [continueWhatsapp, leadId, openChat, requirePhoneBeforeWhatsapp]);

  useEffect(() => {
    if (!sellerAiConfig.enabled || mode === "disabled") return;

    function handleOpen(event: Event) {
      const detail = (event as SellerAiOpenEvent).detail;
      if (detail?.productId && productId && detail.productId !== productId) return;

      if (detail?.action === "whatsapp") {
        void requestWhatsappStep();
        return;
      }

      void openChat();
    }

    window.addEventListener("jakawi:seller-ai-open", handleOpen);
    return () => window.removeEventListener("jakawi:seller-ai-open", handleOpen);
  }, [mode, openChat, productId, requestWhatsappStep]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void continueWhatsapp();
  }

  if (!sellerAiConfig.enabled || mode === "disabled") return null;
  if (step === "closed" && initiallyHidden) return null;

  return (
    <div className="fixed inset-x-0 z-50 flex justify-center px-4 sm:inset-x-auto sm:right-5 sm:justify-end" style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
      {step !== "closed" ? <div className="fixed inset-0 bg-black/10 sm:hidden" onClick={closeWidget} aria-hidden="true" /> : null}

      {step !== "closed" ? (
        <section
          className={cn(
            "fixed inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[24px] border border-brand-border bg-[#FAF7EF] shadow-[0_-18px_48px_rgba(0,0,0,0.16)] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] sm:rounded-lg sm:bg-[#FAF7EF]",
            step === "chat" ? "max-h-[72dvh] sm:h-[560px] sm:max-h-[560px]" : "max-h-[62dvh] sm:max-h-[560px]",
          )}
          style={step === "chat" ? { height: sellerAiConfig.bottomSheetHeightMobile } : undefined}
          aria-label={widgetTitle}
        >
          <header className="shrink-0 border-b border-black/10 bg-brand-dark px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-brand-lime" />
                  <h3 className="truncate text-base font-black leading-5">{widgetTitle}</h3>
                  {leadCode ? <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold leading-4 text-brand-lime">{leadCode}</span> : null}
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold leading-4 text-white/75">{widgetCopy.subtitle}</p>
              </div>
              <button type="button" onClick={closeWidget} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15" aria-label="Cerrar Seller AI">
                <X className="size-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="flex min-h-full flex-col justify-end gap-2.5">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2.5 text-[15px] leading-6 shadow-sm",
                      message.role === "user" ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-brand-border bg-white text-neutral-800",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isAssistantTyping && step === "chat" ? (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-[15px] font-semibold leading-6 text-red-700">{error}</div> : null}

              {step === "phone_capture" ? (
                <div className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
                  <p className="text-sm font-black leading-5 text-brand-dark">{phoneCaptureCopy.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-neutral-600">{phoneCaptureCopy.message}</p>
                </div>
              ) : null}

              {step === "redirecting" ? (
                <div className="rounded-2xl border border-brand-border bg-white p-3 text-center shadow-sm">
                  <Loader2 className="mx-auto size-6 animate-spin text-brand-dark" />
                  <p className="mt-3 text-[15px] font-black text-brand-dark">{widgetCopy.preparingWhatsapp}</p>
                  {redirectError ? <p className="mt-2 text-sm font-semibold text-red-700">{redirectError}</p> : null}
                  {manualWhatsappUrl ? (
                    <a href={manualWhatsappUrl} target="_blank" className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-black text-white">
                      <MessageCircle className="size-4" />
                      {widgetCopy.openWhatsappManually}
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {step === "chat" ? (
            <div className="shrink-0 border-t border-brand-border bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
              {quickReplies.length > 0 ? (
                <div className="relative -mx-4 mb-2.5 overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => void sendMessage(reply)}
                        disabled={chatIsBusy || !leadId}
                        className="h-9 shrink-0 rounded-full border border-brand-border bg-brand-soft px-3 text-sm font-black text-brand-dark transition hover:border-brand hover:bg-brand-lime disabled:opacity-50"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
                </div>
              ) : null}

              <form onSubmit={submitMessage} className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={1000}
                  placeholder={widgetCopy.inputPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-full border border-brand-border bg-[#FAF7EF] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
                <button type="submit" disabled={chatIsBusy || !input.trim() || !leadId} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-dark text-white transition hover:bg-brand disabled:opacity-50" aria-label="Enviar mensaje">
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>

              {showWhatsappCta ? (
                <button
                  type="button"
                  onClick={() => void requestWhatsappStep()}
                  disabled={chatIsBusy}
                  className={cn(
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-full border font-black transition disabled:opacity-50",
                    ctaIsStrong ? "h-11 border-brand bg-brand text-sm text-white shadow-sm hover:bg-brand-dark" : "h-10 border-brand-border bg-white text-sm text-brand-dark hover:border-brand hover:bg-brand-soft",
                  )}
                >
                  <MessageCircle className="size-4" />
                  {ctaIsStrong ? widgetCopy.continueWhatsappLong : widgetCopy.leaveWhatsappInquiry}
                </button>
              ) : null}
            </div>
          ) : null}

          {step === "phone_capture" ? (
            <form onSubmit={submitPhone} className="shrink-0 space-y-2.5 border-t border-brand-border bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
              <SmartPhoneInput
                label="WhatsApp"
                value={customerPhone}
                size="compact"
                theme="light"
                required={requirePhoneBeforeWhatsapp}
                onChange={(value) => {
                  setCustomerPhone(value);
                  setPhoneError(null);
                }}
                onValidityChange={setCustomerPhoneIsValid}
              />
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                placeholder={widgetCopy.namePlaceholder}
                className="h-11 w-full rounded-full border border-brand-border bg-[#FAF7EF] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
              {phoneError ? <p className="px-1 text-sm font-bold text-red-700">{phoneError}</p> : null}
              {redirectError && !manualWhatsappUrl ? <p className="px-1 text-sm font-bold text-red-700">{redirectError}</p> : null}
              {redirectError && manualWhatsappUrl ? (
                <a href={manualWhatsappUrl} target="_blank" className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-black text-white">
                  <MessageCircle className="size-4" />
                  {widgetCopy.openWhatsappManually}
                </a>
              ) : (
                <div className="grid grid-cols-[0.85fr_1.15fr] gap-2 pt-0.5">
                  <button type="button" onClick={() => setStep("chat")} className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                    <ArrowLeft className="size-4" />
                    {widgetCopy.backToChat}
                  </button>
                  <button type="submit" disabled={isLoading} className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-3 text-sm font-black text-white transition hover:bg-brand-dark disabled:opacity-50">
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                    <span className="min-[380px]:hidden">{widgetCopy.continueWhatsapp}</span>
                    <span className="hidden min-[380px]:inline">{widgetCopy.continueWhatsappLong}</span>
                  </button>
                </div>
              )}
            </form>
          ) : null}
        </section>
      ) : (
        <div className="flex flex-col items-end gap-2 sm:items-end">
          {showTeaser ? (
            <div className="max-w-[min(310px,calc(100vw-2rem))] rounded-2xl rounded-br-md border border-brand-border bg-white px-4 py-3 text-[15px] font-bold leading-5 text-brand-dark shadow-lg shadow-black/10">
              {teaserText}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void openChat()}
            className={cn(
              "flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-[15px] font-black text-white shadow-xl shadow-black/20 transition hover:bg-brand active:scale-[0.98]",
              isNudging && "seller-ai-nudge",
            )}
          >
            <Sparkles className="size-5 text-brand-lime" />
            <span className="truncate">{closedLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
