"use client";

import { ArrowLeft, Loader2, MessageCircle, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartPhoneInput } from "@/components/forms/SmartPhoneInput";
import { sellerAiConfig } from "@/config/seller-ai";
import { getVisitorSessionId } from "@/lib/session-id";
import type { SellerAiMode as StorefrontSellerAiMode } from "@/lib/storefront-flow";
import type { SellerAiMode as CommercialSellerAiMode } from "@/lib/seller-ai/modes";
import type { SellerVoiceNoteConfig, SellerVoiceNoteType } from "@/lib/seller-ai/voice-notes";
import { cn } from "@/lib/ui";
import { SellerAiVoiceNote } from "./SellerAiVoiceNote";
import { TypingIndicator } from "./TypingIndicator";

type TextChatMessage = {
  id: string;
  role: "assistant" | "user";
  type: "text";
  text: string;
};

type VoiceChatMessage = {
  id: string;
  role: "assistant";
  type: "voice";
  voiceNote: SellerVoiceNoteConfig;
  text?: string;
};

type ChatMessage = TextChatMessage | VoiceChatMessage;

type AssistantApiResponse = {
  assistantMessage?: string | null;
  message?: string | null;
  voiceNote?: SellerVoiceNoteConfig | null;
};

type WidgetStep = "closed" | "chat" | "phone_capture" | "redirecting";

type RecommendedProduct = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
  imageUrl?: string | null;
  shortReason?: string | null;
};

type SellerAiWidgetProps = {
  storeSlug: string;
  storeName: string;
  productId?: string;
  productName?: string;
  productImageUrl?: string | null;
  productPriceLabel?: string | null;
  categoryName?: string | null;
  whatsapp?: string;
  planCode?: string | null;
  mode?: StorefrontSellerAiMode;
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

function voiceRecordingDelay() {
  return 700 + Math.floor(Math.random() * 901);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message ?? "Request failed") as Error & { payload?: Record<string, unknown>; code?: string };
    error.payload = payload ?? undefined;
    error.code = typeof payload?.code === "string" ? payload.code : undefined;
    throw error;
  }
  return response.json() as Promise<T>;
}

function getSellerAiLimitMessage(error: unknown) {
  const payload = error instanceof Error ? (error as Error & { payload?: { code?: string; message?: string } }).payload : undefined;
  if (payload?.code === "SELLER_AI_LIMIT_REACHED") {
    return "Esta tienda alcanzó el límite mensual de Seller AI. Puedes dejar tu consulta por WhatsApp y el vendedor te responderá directamente.";
  }
  if (payload?.code === "SELLER_AI_NOT_AVAILABLE" || payload?.code === "TRIAL_EXPIRED") {
    return "Seller AI no está disponible ahora. Puedes dejar tu consulta por WhatsApp y el vendedor te responderá directamente.";
  }
  return null;
}

function hasStrongIntent(input: string) {
  return /quiero comprar|me interesa comprar|quiero pedir|quiero reservar|quiero pagar|lo quiero|lo quiero comprar|comprarlo|comprarla|continuar por whatsapp|consultar por whatsapp|hablemos por whatsapp|enviar consulta|dejar consulta|pasar a whatsapp|quiero que me escriban/i.test(input);
}

function normalizeReply(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,:;]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function voiceNoteSeenKey(type: SellerVoiceNoteType, storeSlug: string, journeyId: string) {
  return `jakawi_voice_${type.toLowerCase()}_seen_${storeSlug}_${journeyId}`;
}

function introDisabledKey(storeSlug: string) {
  return `jakawi_voice_intro_disabled_${storeSlug}`;
}

const assistantEmptyFallback = "Listo. Puedo dejar tu consulta preparada para enviarla al vendedor por WhatsApp.";
const assistantVoiceHiddenFallback = "Listo, preparé tu consulta para continuar por WhatsApp.";
const assistantFetchFailureFallback = "No pude responder en este momento. Puedes continuar por WhatsApp y el vendedor te ayuda directamente.";

export function SellerAiWidget({
  storeSlug,
  storeName,
  productId,
  productName,
  productImageUrl,
  productPriceLabel,
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
  const currentProductKey = `${productId ?? "store"}:${productName ?? ""}`;
  const [sessionId] = useState(() => (typeof window === "undefined" ? "" : getVisitorSessionId()));
  const [step, setStep] = useState<WidgetStep>("closed");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadCode, setLeadCode] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>(sellerAiConfig.quickReplies.default);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [showRecommendedProductCards, setShowRecommendedProductCards] = useState(false);
  const [recommendedProductContextKey, setRecommendedProductContextKey] = useState<string | null>(null);
  const [commercialMode, setCommercialMode] = useState<CommercialSellerAiMode | null>(null);
  const [commercialStage, setCommercialStage] = useState<CommercialSellerAiMode | null>(null);
  const [voiceNotesByType, setVoiceNotesByType] = useState<Partial<Record<SellerVoiceNoteType, SellerVoiceNoteConfig>>>({});
  const [detectedNeed, setDetectedNeed] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneIsValid, setCustomerPhoneIsValid] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [assistantIndicator, setAssistantIndicator] = useState<"typing" | "recording">("typing");
  const [shouldShowWhatsappCta, setShouldShowWhatsappCta] = useState(false);
  const [hasStrongPurchaseIntent, setHasStrongPurchaseIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [manualWhatsappUrl, setManualWhatsappUrl] = useState<string | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      if (typeof window === "undefined") return true;
      const saved = window.localStorage.getItem("jakawi_seller_ai_sound_enabled");
      return saved == null ? true : saved !== "false";
    } catch {
      return true;
    }
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openedRef = useRef(false);
  const assistantBusyRef = useRef(false);
  const shownVoiceNoteTypesRef = useRef<Set<SellerVoiceNoteType>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  const isClosed = step === "closed";
  const isAssistantBusy = isLoading || isAssistantTyping;
  const chatIsBusy = isAssistantBusy;
  const ctaIsStrong = hasStrongPurchaseIntent || commercialStage === "CLOSING_PREP";
  const showWhatsappCta = step === "chat" && messages.length > 0;
  const contextSubtitle = productName ? `Asesorando: ${productName}` : `Te ayuda ${storeName}`;
  const whatsappCtaText = ctaIsStrong
    ? widgetCopy.sendWhatsappInquiry
    : commercialStage === "DECISION_SUPPORT"
      ? widgetCopy.consultWhatsapp
      : productName
        ? widgetCopy.leaveWhatsappInquiry
        : widgetCopy.continueWhatsappLong;

  const getAudioContext = useCallback(() => {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  }, []);

  const playChatTone = useCallback(
    (kind: "send" | "receive") => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const audioContext = getAudioContext();
        if (!audioContext) return;
        void audioContext.resume();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(kind === "send" ? 620 : 420, now);
        oscillator.frequency.exponentialRampToValueAtTime(kind === "send" ? 760 : 520, now + 0.08);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(kind === "send" ? 0.035 : 0.028, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.14);
      } catch {
        // Chat sounds are optional and should never block the flow.
      }
    },
    [getAudioContext, soundEnabled],
  );

  function toggleSound() {
    setSoundEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("jakawi_seller_ai_sound_enabled", String(next));
        if (next) {
          const audioContext = getAudioContext();
          void audioContext?.resume();
        }
      } catch {
        // Preference storage is best effort.
      }
      return next;
    });
  }

  const hasSeenVoiceNote = useCallback(
    (voiceNote: SellerVoiceNoteConfig, resolvedJourneyId?: string | null) => {
      if (!resolvedJourneyId) return true;
      if (shownVoiceNoteTypesRef.current.has(voiceNote.type)) return true;
      try {
        if (voiceNote.type === "INTRO" && window.localStorage.getItem(introDisabledKey(storeSlug)) === "true") return true;
        return window.localStorage.getItem(voiceNoteSeenKey(voiceNote.type, storeSlug, resolvedJourneyId)) === "true";
      } catch {
        return false;
      }
    },
    [storeSlug],
  );

  const markVoiceNoteSeen = useCallback(
    (voiceNote: SellerVoiceNoteConfig, resolvedJourneyId?: string | null) => {
      shownVoiceNoteTypesRef.current.add(voiceNote.type);
      if (!resolvedJourneyId) return;
      try {
        window.localStorage.setItem(voiceNoteSeenKey(voiceNote.type, storeSlug, resolvedJourneyId), "true");
      } catch {
        // Local visibility state is best effort.
      }
    },
    [storeSlug],
  );

  const getVisibleAssistantText = useCallback((response: AssistantApiResponse, fallback: string) => {
    const voiceTranscript = response.voiceNote?.transcript?.trim();
    return response.assistantMessage?.trim() || response.message?.trim() || voiceTranscript || fallback;
  }, []);

  const appendAssistantResponse = useCallback(
    async (response: AssistantApiResponse, resolvedJourneyId?: string | null) => {
      const voiceNote = response.voiceNote;
      const shouldShowVoiceNote = Boolean(voiceNote?.enabled && !hasSeenVoiceNote(voiceNote, resolvedJourneyId));

      try {
        if (voiceNote && shouldShowVoiceNote) {
          setIsAssistantTyping(false);
          setAssistantIndicator("recording");
          setIsAssistantTyping(true);
          await wait(voiceRecordingDelay());
          const voiceMessage: VoiceChatMessage = {
            id: messageId(),
            role: "assistant",
            type: "voice",
            voiceNote,
            text: getVisibleAssistantText(response, assistantVoiceHiddenFallback),
          };
          setMessages((current) => [...current, voiceMessage]);
          markVoiceNoteSeen(voiceNote, resolvedJourneyId);
          playChatTone("receive");
          return;
        }

        setIsAssistantTyping(false);
        setAssistantIndicator("typing");
        setIsAssistantTyping(true);
        await wait(assistantTypingDelay());
        const fallback = voiceNote ? assistantVoiceHiddenFallback : assistantEmptyFallback;
        const text = getVisibleAssistantText(response, fallback);
        setMessages((current) => [...current, { id: messageId(), role: "assistant", type: "text", text }]);
        playChatTone("receive");
      } finally {
        setIsAssistantTyping(false);
        setAssistantIndicator("typing");
        window.requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
      }
    },
    [getVisibleAssistantText, hasSeenVoiceNote, markVoiceNoteSeen, playChatTone],
  );

  const hideIntroVoiceNote = useCallback(() => {
    try {
      window.localStorage.setItem(introDisabledKey(storeSlug), "true");
    } catch {
      // Local preference is best effort.
    }
    setMessages((current) => current.filter((message) => !(message.type === "voice" && message.voiceNote.type === "INTRO")));
  }, [storeSlug]);

  const displayedQuickReplies = useMemo(() => {
    const userMessages = messages.filter((message): message is TextChatMessage => message.role === "user" && message.type === "text").map((message) => normalizeReply(message.text));
    const used = new Set(userMessages);
    const lastUserMessage = userMessages[userMessages.length - 1] ?? "";
    const normalizedNeed = normalizeReply(detectedNeed);

    return quickReplies
      .filter((reply) => {
        const normalizedReply = normalizeReply(reply);
        if (!normalizedReply || normalizedReply === lastUserMessage || used.has(normalizedReply)) return false;
        if (normalizedNeed === "regalo" && (normalizedReply === "para regalar" || normalizedReply === "es para regalar")) return false;
        if (normalizedNeed === "fotos" && normalizedReply === "fotos") return false;
        if (normalizedNeed === "uso personal" && normalizedReply === "para mi") return false;
        return normalizedReply !== normalizedNeed;
      })
      .slice(0, 4);
  }, [detectedNeed, messages, quickReplies]);

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
      void postJson<{ journeyId?: string }>("/api/seller-ai/events", {
        sessionId,
        visitorId: sessionId,
        storeSlug,
        eventType: "PRODUCT_VIEW",
        productId,
        metadata: { productName, categoryName },
      })
        .then((response) => {
          if (response.journeyId) setJourneyId(response.journeyId);
        })
        .catch(() => undefined);
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
  }, [displayedQuickReplies.length, error, isAssistantTyping, isLoading, messages.length, phoneError, redirectError, shouldShowWhatsappCta, step]);

  const openChat = useCallback(async (options?: { afterOpen?: WidgetStep }) => {
    setHasInteracted(true);
    setShowTeaser(false);
    setStep("chat");
    setRecommendedProducts([]);
    setShowRecommendedProductCards(false);
    setRecommendedProductContextKey(null);
    if (!sessionId) return null;
    if (openedRef.current) {
      if (options?.afterOpen) setStep(options.afterOpen);
      return leadId;
    }
    openedRef.current = true;
    setIsLoading(true);
    if (messages.length === 0) {
      setAssistantIndicator("typing");
      setIsAssistantTyping(true);
    }
    setError(null);
    let nextLeadId: string | null = null;
    const openingDelay = messages.length === 0 ? wait(sellerAiConfig.typing.openingDelayMs) : Promise.resolve();

    try {
      const eventResponse = await postJson<{ journeyId?: string }>("/api/seller-ai/events", {
        sessionId,
        visitorId: sessionId,
        storeSlug,
        eventType: "CHAT_OPENED",
        productId,
      });
      const resolvedJourneyId = eventResponse.journeyId ?? journeyId;
      if (resolvedJourneyId) setJourneyId(resolvedJourneyId);

      const openingPromise = postJson<{
        leadId: string;
        leadCode: string;
        journeyId?: string;
        message: string;
        assistantMessage?: string;
        mode?: CommercialSellerAiMode;
        stage?: CommercialSellerAiMode;
        quickReplies: string[];
        recommendedProducts?: RecommendedProduct[];
        showRecommendedProducts?: boolean;
        voiceNotes?: {
          intro?: SellerVoiceNoteConfig;
          guidance?: SellerVoiceNoteConfig;
          handoff?: SellerVoiceNoteConfig;
        };
      }>("/api/seller-ai/opening", { sessionId, visitorId: sessionId, storeSlug, productId, journeyId: resolvedJourneyId });
      const [opening] = await Promise.all([openingPromise, openingDelay]);
      setLeadId(opening.leadId);
      nextLeadId = opening.leadId;
      setLeadCode(opening.leadCode);
      if (opening.journeyId) setJourneyId(opening.journeyId);
      if (opening.mode) setCommercialMode(opening.mode);
      if (opening.stage) setCommercialStage(opening.stage);
      setVoiceNotesByType({
        INTRO: opening.voiceNotes?.intro,
        GUIDANCE: opening.voiceNotes?.guidance,
        HANDOFF: opening.voiceNotes?.handoff,
      });
      const nextJourneyId = opening.journeyId ?? resolvedJourneyId;
      await appendAssistantResponse({ assistantMessage: opening.assistantMessage ?? opening.message, message: opening.message, voiceNote: opening.voiceNotes?.intro }, nextJourneyId);
      setQuickReplies(opening.quickReplies);
      setShowRecommendedProductCards(opening.showRecommendedProducts === true);
      setRecommendedProductContextKey(opening.showRecommendedProducts === true ? currentProductKey : null);
      setRecommendedProducts(opening.showRecommendedProducts === true ? (opening.recommendedProducts ?? []).slice(0, sellerAiConfig.maxRecommendedProducts) : []);
      if (options?.afterOpen === "phone_capture") await appendAssistantResponse({ voiceNote: opening.voiceNotes?.handoff }, nextJourneyId);
      if (options?.afterOpen && nextLeadId) setStep(options.afterOpen);
      return nextLeadId;
    } catch (error) {
      setError(getSellerAiLimitMessage(error) ?? "No pude cargar el vendedor ahora. Puedes intentar continuar por WhatsApp.");
      openedRef.current = false;
      return null;
    } finally {
      setIsAssistantTyping(false);
      setAssistantIndicator("typing");
      setIsLoading(false);
    }
  }, [appendAssistantResponse, currentProductKey, journeyId, leadId, messages.length, productId, sessionId, storeSlug]);

  const closeWidget = useCallback(() => {
    setHasInteracted(true);
    setShowTeaser(false);
    setStep("closed");
  }, []);

  const sendMessage = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (!clean || (!leadId && !journeyId)) return;
      if (assistantBusyRef.current || isAssistantBusy) return;
      assistantBusyRef.current = true;
      playChatTone("send");
      setInput("");
      setMessages((current) => [...current, { id: messageId(), role: "user", type: "text", text: clean }]);
      setRecommendedProducts([]);
      setShowRecommendedProductCards(false);
      setRecommendedProductContextKey(null);
      setIsLoading(true);
      setIsAssistantTyping(true);
      setAssistantIndicator("typing");
      setError(null);
      if (hasStrongIntent(clean)) {
        setShouldShowWhatsappCta(true);
        setHasStrongPurchaseIntent(true);
      }

      try {
        const response = await postJson<{
          leadId?: string;
          leadCode?: string;
          journeyId?: string;
          assistantMessage?: string;
          message?: string;
          mode?: CommercialSellerAiMode;
          stage?: CommercialSellerAiMode;
          quickReplies: string[];
          recommendedProducts?: RecommendedProduct[];
          showRecommendedProducts?: boolean;
          shouldShowWhatsappCta: boolean;
          shouldStartPhoneCapture?: boolean;
          detectedNeed?: string | null;
          voiceNote?: SellerVoiceNoteConfig | null;
          voiceNoteSuggestion?: SellerVoiceNoteType;
        }>("/api/seller-ai/chat", { leadId: leadId ?? undefined, journeyId: journeyId ?? undefined, sessionId, visitorId: sessionId, storeSlug, message: clean, currentProductId: productId });
        if (response.leadId) setLeadId(response.leadId);
        if (response.leadCode) setLeadCode(response.leadCode);
        if (response.journeyId) setJourneyId(response.journeyId);
        if (response.mode) setCommercialMode(response.mode);
        if (response.stage) setCommercialStage(response.stage);
        if (response.detectedNeed !== undefined) setDetectedNeed(response.detectedNeed ?? null);
        await appendAssistantResponse(response, response.journeyId ?? journeyId);
        setQuickReplies(response.quickReplies);
        setShowRecommendedProductCards(response.showRecommendedProducts === true);
        setRecommendedProductContextKey(response.showRecommendedProducts === true ? currentProductKey : null);
        setRecommendedProducts(response.showRecommendedProducts === true ? (response.recommendedProducts ?? []).slice(0, sellerAiConfig.maxRecommendedProducts) : []);
        setShouldShowWhatsappCta((current) => current || response.shouldShowWhatsappCta);
        if (response.shouldStartPhoneCapture) setHasStrongPurchaseIntent(true);
        if ((response.shouldStartPhoneCapture || /a qu[eé] whatsapp pueden escribirte/i.test(response.assistantMessage ?? response.message ?? "")) && requirePhoneBeforeWhatsapp) setStep("phone_capture");
      } catch (error) {
        await appendAssistantResponse({ assistantMessage: getSellerAiLimitMessage(error) ?? assistantFetchFailureFallback }, journeyId);
        setShouldShowWhatsappCta(true);
      } finally {
        setIsLoading(false);
        setIsAssistantTyping(false);
        setAssistantIndicator("typing");
        assistantBusyRef.current = false;
      }
    },
    [appendAssistantResponse, currentProductKey, isAssistantBusy, journeyId, leadId, playChatTone, productId, requirePhoneBeforeWhatsapp, sessionId, storeSlug],
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
        journeyId: journeyId ?? undefined,
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
  }, [customerName, customerPhone, customerPhoneIsValid, journeyId, leadId, productId, requirePhoneBeforeWhatsapp, widgetCopy.phoneInvalidError, widgetCopy.redirectFailed]);

  const requestWhatsappStep = useCallback(async () => {
    if (assistantBusyRef.current || isAssistantBusy) return;
    setError(null);
    setRedirectError(null);
    if (!leadId) {
      await openChat({ afterOpen: requirePhoneBeforeWhatsapp ? "phone_capture" : "chat" });
      return;
    }
    assistantBusyRef.current = true;
    try {
      if (requirePhoneBeforeWhatsapp) {
        await appendAssistantResponse({ voiceNote: voiceNotesByType.HANDOFF }, journeyId);
        setStep("phone_capture");
        return;
      }
      await appendAssistantResponse({ voiceNote: voiceNotesByType.HANDOFF }, journeyId);
      await continueWhatsapp();
    } finally {
      assistantBusyRef.current = false;
      setIsLoading(false);
      setIsAssistantTyping(false);
      setAssistantIndicator("typing");
    }
  }, [appendAssistantResponse, continueWhatsapp, isAssistantBusy, journeyId, leadId, openChat, requirePhoneBeforeWhatsapp, voiceNotesByType.HANDOFF]);

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
      {step !== "closed" ? <div className="fixed inset-0 hidden bg-black/10 sm:block" onClick={closeWidget} aria-hidden="true" /> : null}

      {step !== "closed" ? (
        <section
          className={cn(
            "fixed inset-0 flex h-[100dvh] max-h-none flex-col overflow-hidden border-0 bg-[var(--space-background)] text-[var(--space-background-contrast)] shadow-none sm:inset-auto sm:right-5 sm:bottom-5 sm:w-[400px] sm:rounded-lg sm:border sm:border-[var(--space-border)] sm:shadow-[0_18px_48px_rgba(0,0,0,0.16)]",
            step === "chat" ? "sm:h-[560px] sm:max-h-[560px]" : "sm:max-h-[560px]",
          )}
          aria-label={widgetTitle}
          data-seller-ai-mode={commercialMode ?? undefined}
          data-seller-ai-stage={commercialStage ?? undefined}
        >
          <header className="shrink-0 border-b border-black/10 bg-[var(--space-primary)] px-3 pb-2 pt-[calc(env(safe-area-inset-top)+8px)] text-[var(--space-primary-contrast)] sm:px-4 sm:pt-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button type="button" onClick={closeWidget} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 text-xs font-black transition hover:bg-white/15 min-[380px]:px-2.5">
                <ArrowLeft className="size-4" />
                <span className="max-[340px]:hidden">Volver al espacio</span>
                <span className="hidden max-[340px]:inline">Volver</span>
              </button>
              <div className="flex min-w-0 items-center justify-center gap-1.5">
                <Sparkles className="size-4 shrink-0 text-[var(--space-accent)]" />
                <h3 className="truncate text-sm font-black leading-5">{widgetTitle}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleSound} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label={soundEnabled ? "Silenciar chat" : "Activar sonido del chat"}>
                  {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
                <button type="button" onClick={closeWidget} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Cerrar Seller AI">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-[11px] font-semibold leading-4 opacity-75">{contextSubtitle}</p>
              {leadCode ? <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-4 text-[var(--space-accent)]">{leadCode}</span> : null}
            </div>
          </header>

          <div className="shrink-0 border-b border-[var(--space-border)] bg-[var(--space-surface)] px-4 py-2 text-[var(--space-surface-contrast)]">
            {productName ? (
              <div className="flex items-center gap-2.5">
                {productImageUrl ? <Image src={productImageUrl} alt="" width={40} height={40} sizes="40px" unoptimized className="size-10 shrink-0 rounded-md object-cover" /> : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-normal text-neutral-500">Producto seleccionado</p>
                  <p className="truncate text-[13px] font-black leading-4">{productName}</p>
                  <p className="truncate text-[12px] font-semibold leading-4 text-neutral-500">{[productPriceLabel, categoryName].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-neutral-600">Estoy aquí para ayudarte a elegir.</p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="flex min-h-full flex-col justify-end gap-2.5">
              {messages.map((message) =>
                message.type === "voice" ? (
                  <SellerAiVoiceNote key={message.id} voiceNote={message.voiceNote} onDismiss={message.voiceNote.type === "INTRO" ? hideIntroVoiceNote : undefined} />
                ) : (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2.5 text-[15px] leading-6 shadow-sm",
                        message.role === "user" ? "rounded-br-md bg-[var(--space-primary)] text-[var(--space-primary-contrast)]" : "rounded-bl-md border border-[var(--space-border)] bg-white text-neutral-800",
                      )}
                    >
                      {message.text}
                    </div>
                  </div>
                ),
              )}

              {isAssistantTyping && step === "chat" ? (
                <div className="flex justify-start">
                  <TypingIndicator variant={assistantIndicator} />
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-[15px] font-semibold leading-6 text-red-700">{error}</div> : null}

              {step === "chat" && showRecommendedProductCards && recommendedProductContextKey === currentProductKey && recommendedProducts.length > 0 ? (
                <div className="w-full rounded-2xl rounded-bl-md border border-[var(--space-border)] bg-white p-2.5 shadow-sm">
                  <div className="space-y-2">
                    {recommendedProducts.map((product) => (
                      <div key={product.id} className="grid grid-cols-[auto_1fr] gap-2 rounded-md bg-[var(--space-muted)] p-2">
                        {product.imageUrl ? <Image src={product.imageUrl} alt="" width={48} height={48} sizes="48px" unoptimized className="size-12 rounded-md object-cover" /> : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-neutral-900">{product.name}</p>
                          <p className="text-xs font-bold text-neutral-700">{product.priceLabel}</p>
                          {product.shortReason ? <p className="line-clamp-2 text-xs font-semibold leading-4 text-neutral-500">{product.shortReason}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <a href={`/${storeSlug}/p/${product.slug}`} className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--space-border)] bg-white px-3 text-xs font-black text-neutral-800 transition hover:bg-[var(--space-muted)]">
                              Ver
                            </a>
                            <button
                              type="button"
                              onClick={() => void sendMessage(`Me interesa ${product.name}`)}
                              disabled={chatIsBusy || !leadId}
                              className="inline-flex h-8 items-center justify-center rounded-full bg-[var(--space-primary)] px-3 text-xs font-black text-[var(--space-primary-contrast)] transition hover:brightness-95 disabled:opacity-50"
                            >
                              Me interesa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === "phone_capture" ? (
                <div className="rounded-2xl border border-[var(--space-border)] bg-white p-3 shadow-sm">
                  <p className="text-sm font-black leading-5 text-neutral-900">{phoneCaptureCopy.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-neutral-600">{phoneCaptureCopy.message}</p>
                </div>
              ) : null}

              {step === "redirecting" ? (
                <div className="rounded-2xl border border-[var(--space-border)] bg-white p-3 text-center shadow-sm">
                  <Loader2 className="mx-auto size-6 animate-spin text-[var(--space-primary)]" />
                  <p className="mt-3 text-[15px] font-black text-neutral-900">{widgetCopy.preparingWhatsapp}</p>
                  {redirectError ? <p className="mt-2 text-sm font-semibold text-red-700">{redirectError}</p> : null}
                  {manualWhatsappUrl ? (
                    <a href={manualWhatsappUrl} target="_blank" className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--space-primary)] px-4 text-sm font-black text-[var(--space-primary-contrast)]">
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
            <div className="shrink-0 border-t border-[var(--space-border)] bg-[var(--space-surface)] px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
              {displayedQuickReplies.length > 0 ? (
                <div className="relative -mx-4 mb-2.5 overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {displayedQuickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => void sendMessage(reply)}
                        disabled={chatIsBusy || !leadId}
                        className="h-9 shrink-0 rounded-full border border-[var(--space-border)] bg-[var(--space-muted)] px-3 text-sm font-black text-[var(--space-surface-contrast)] transition hover:brightness-95 disabled:opacity-50"
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
                  disabled={isAssistantBusy}
                  maxLength={1000}
                  placeholder={widgetCopy.inputPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-full border border-[var(--space-border)] bg-[var(--space-background)] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-[var(--space-primary)] focus:ring-4 focus:ring-black/10 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={chatIsBusy || !input.trim() || !leadId}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-[color:var(--space-primary,#128C4A)] text-[color:var(--space-primary-contrast,#fff)] shadow-md shadow-black/15 transition hover:brightness-95 active:scale-[0.97] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:opacity-100 disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100"
                  aria-label="Enviar mensaje"
                >
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
                    ctaIsStrong ? "h-11 border-[var(--space-primary)] bg-[var(--space-primary)] text-sm text-[var(--space-primary-contrast)] shadow-sm hover:brightness-95" : "h-10 border-[var(--space-border)] bg-white text-sm text-neutral-800 hover:bg-[var(--space-muted)]",
                  )}
                >
                  <MessageCircle className="size-4 shrink-0" />
                  <span className="min-w-0 text-center leading-none">{whatsappCtaText}</span>
                </button>
              ) : null}
            </div>
          ) : null}

          {step === "phone_capture" ? (
            <form onSubmit={submitPhone} className="shrink-0 space-y-2.5 border-t border-[var(--space-border)] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
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
                className="h-11 w-full rounded-full border border-[var(--space-border)] bg-[var(--space-background)] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-[var(--space-primary)] focus:ring-4 focus:ring-black/10"
              />
              {phoneError ? <p className="px-1 text-sm font-bold text-red-700">{phoneError}</p> : null}
              {redirectError && !manualWhatsappUrl ? <p className="px-1 text-sm font-bold text-red-700">{redirectError}</p> : null}
              {redirectError && manualWhatsappUrl ? (
                <a href={manualWhatsappUrl} target="_blank" className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--space-primary)] px-4 text-sm font-black text-[var(--space-primary-contrast)]">
                  <MessageCircle className="size-4" />
                  {widgetCopy.openWhatsappManually}
                </a>
              ) : (
                <div className="grid grid-cols-[0.85fr_1.15fr] gap-2 pt-0.5">
                  <button type="button" onClick={() => setStep("chat")} className="flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[var(--space-border)] bg-white px-3 text-sm font-black text-neutral-800 transition hover:bg-[var(--space-muted)]">
                    <ArrowLeft className="size-4" />
                    {widgetCopy.backToChat}
                  </button>
                  <button type="submit" disabled={isLoading} className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-[var(--space-primary)] px-3 text-sm font-black text-[var(--space-primary-contrast)] transition hover:brightness-95 disabled:opacity-50">
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                    <span className="min-w-0 whitespace-nowrap leading-none">{isLoading ? "Abriendo WhatsApp..." : "Ir a WhatsApp"}</span>
                  </button>
                </div>
              )}
            </form>
          ) : null}
        </section>
      ) : (
        <div className="flex flex-col items-end gap-2 sm:items-end">
          {showTeaser ? (
            <div className="max-w-[min(310px,calc(100vw-2rem))] rounded-2xl rounded-br-md border border-[var(--space-border)] bg-[var(--space-surface)] px-4 py-3 text-[15px] font-bold leading-5 text-[var(--space-surface-contrast)] shadow-lg shadow-black/10">
              {teaserText}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void openChat()}
            className={cn(
              "flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-[var(--space-primary)] px-4 py-3 text-[15px] font-black text-[var(--space-primary-contrast)] shadow-xl shadow-black/20 transition hover:brightness-95 active:scale-[0.98]",
              isNudging && "seller-ai-nudge",
            )}
          >
            <Sparkles className="size-5 text-[var(--space-accent)]" />
            <span className="truncate">{closedLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
