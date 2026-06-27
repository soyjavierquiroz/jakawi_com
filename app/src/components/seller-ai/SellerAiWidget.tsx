"use client";

import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sellerAiConfig } from "@/config/seller-ai";
import { getVisitorSessionId } from "@/lib/session-id";
import { cn } from "@/lib/ui";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type SellerAiWidgetProps = {
  storeSlug: string;
  storeName: string;
  productId?: string;
  productName?: string;
  categoryName?: string | null;
  whatsapp?: string;
};

function messageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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

export function SellerAiWidget({ storeSlug, storeName, productId, productName, categoryName }: SellerAiWidgetProps) {
  const [sessionId] = useState(() => (typeof window === "undefined" ? "" : getVisitorSessionId()));
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadCode, setLeadCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>(sellerAiConfig.quickReplies.default);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShowWhatsappCta, setShouldShowWhatsappCta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);

  const teaserText = useMemo(() => {
    if (!productName) return sellerAiConfig.widget.closedLabel;
    const category = (categoryName ?? "").toLowerCase();
    if (/celular|tecnolog/.test(category)) return "Ese modelo puede ser buena opción.";
    if (/ropa|vestido|moda/.test(category)) return "Ese modelo puede quedar muy bien.";
    if (/zapato|zapatilla/.test(category)) return "Ese modelo combina fácil.";
    return sellerAiConfig.widget.closedLabel;
  }, [categoryName, productName]);

  useEffect(() => {
    if (!sellerAiConfig.enabled) return;
    if (!sessionId) return;

    if (productId) {
      void postJson("/api/seller-ai/events", {
        sessionId,
        storeSlug,
        eventType: "PRODUCT_VIEW",
        productId,
        metadata: { productName, categoryName },
      }).catch(() => undefined);
    }

    const timer = window.setTimeout(() => setShowTeaser(true), sellerAiConfig.activationDelayMs);
    return () => window.clearTimeout(timer);
  }, [categoryName, productId, productName, sessionId, storeSlug]);

  const openChat = useCallback(async () => {
    setIsOpen(true);
    setShowTeaser(false);
    if (!sessionId || openedRef.current) return;
    openedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await postJson("/api/seller-ai/events", {
        sessionId,
        storeSlug,
        eventType: "CHAT_OPENED",
        productId,
      });

      if (productId) {
        const opening = await postJson<{
          leadId: string;
          leadCode: string;
          message: string;
          quickReplies: string[];
        }>("/api/seller-ai/opening", { sessionId, storeSlug, productId });
        setLeadId(opening.leadId);
        setLeadCode(opening.leadCode);
        setMessages([{ id: messageId(), role: "assistant", content: opening.message }]);
        setQuickReplies(opening.quickReplies);
      } else {
        const lead = await postJson<{ leadId: string; leadCode: string }>("/api/seller-ai/lead", {
          sessionId,
          storeSlug,
          source: "store_page",
        });
        setLeadId(lead.leadId);
        setLeadCode(lead.leadCode);
        setMessages([
          {
            id: messageId(),
            role: "assistant",
            content: `Vi que estás mirando ${storeName}. Te ayudo a elegir mejor: ¿buscas algo para ti o para regalar?`,
          },
        ]);
      }
    } catch {
      setError("No pude cargar el vendedor ahora. Puedes continuar por WhatsApp.");
      openedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [productId, sessionId, storeName, storeSlug]);

  const sendMessage = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (!clean || !leadId) return;
      setInput("");
      setMessages((current) => [...current, { id: messageId(), role: "user", content: clean }]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await postJson<{
          assistantMessage: string;
          quickReplies: string[];
          shouldShowWhatsappCta: boolean;
        }>("/api/seller-ai/chat", { leadId, message: clean, currentProductId: productId });
        setMessages((current) => [...current, { id: messageId(), role: "assistant", content: response.assistantMessage }]);
        setQuickReplies(response.quickReplies);
        setShouldShowWhatsappCta(response.shouldShowWhatsappCta);
      } catch {
        setError("No pude responder eso ahora. La tienda puede confirmarlo por WhatsApp.");
        setShouldShowWhatsappCta(true);
      } finally {
        setIsLoading(false);
      }
    },
    [leadId, productId],
  );

  const continueWhatsapp = useCallback(async () => {
    if (!leadId) {
      await openChat();
      return;
    }

    setIsLoading(true);
    try {
      const response = await postJson<{ whatsappUrl: string }>("/api/seller-ai/continue-whatsapp", {
        leadId,
        selectedProductId: productId,
      });
      window.location.href = response.whatsappUrl;
    } catch {
      setError("No pude preparar WhatsApp. Intenta otra vez en un momento.");
    } finally {
      setIsLoading(false);
    }
  }, [leadId, openChat, productId]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (!sellerAiConfig.enabled) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:inset-x-auto sm:right-5 sm:justify-end">
      {isOpen ? (
        <section
          className="fixed inset-x-0 bottom-0 flex max-h-[560px] flex-col rounded-t-2xl border border-brand-border bg-brand-paper shadow-2xl shadow-black/20 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[560px] sm:w-[380px] sm:rounded-lg"
          style={{ height: sellerAiConfig.bottomSheetHeightMobile }}
          aria-label="Seller AI"
        >
          <header className="flex items-start justify-between gap-4 rounded-t-2xl bg-brand-dark px-4 py-4 text-white sm:rounded-t-lg">
            <div>
              <div className="flex items-center gap-2 font-black">
                <Sparkles className="size-4 text-brand-lime" />
                {sellerAiConfig.widget.openedTitle}
              </div>
              <p className="mt-1 text-xs font-medium text-white/70">{sellerAiConfig.widget.openedSubtitle}</p>
              {leadCode ? <p className="mt-1 font-mono text-[11px] text-brand-lime">{leadCode}</p> : null}
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-md bg-white/10 text-white hover:bg-white/15" aria-label="Cerrar Seller AI">
              <X className="size-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user" ? "bg-brand text-white" : "border border-brand-border bg-brand-muted text-neutral-800",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-muted px-3 py-2 text-sm font-semibold text-neutral-600">
                <Bot className="size-4" />
                Preparando respuesta...
              </div>
            ) : null}
            {error ? <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
          </div>

          <div className="border-t border-brand-border bg-white px-4 py-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => void sendMessage(reply)}
                  disabled={isLoading || !leadId}
                  className="shrink-0 rounded-full border border-brand-border bg-brand-soft px-3 py-2 text-xs font-black text-brand-dark transition hover:border-brand hover:bg-brand-lime disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>

            <form onSubmit={submitMessage} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1000}
                placeholder={sellerAiConfig.widget.inputPlaceholder}
                className="min-w-0 flex-1 rounded-md border border-brand-border bg-brand-paper px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
              <button type="submit" disabled={isLoading || !input.trim() || !leadId} className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-dark text-white transition hover:bg-brand disabled:opacity-50" aria-label="Enviar mensaje">
                <Send className="size-4" />
              </button>
            </form>

            <button
              type="button"
              onClick={() => void continueWhatsapp()}
              disabled={isLoading}
              className={cn(
                "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border font-black transition",
                shouldShowWhatsappCta || messages.length > 0 ? "border-brand bg-brand text-white hover:bg-brand-dark" : "border-brand-border bg-brand-paper text-brand-dark hover:border-brand",
              )}
            >
              <MessageCircle className="size-4" />
              {sellerAiConfig.widget.continueWhatsapp}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => void openChat()}
          className={cn(
            "flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/20 transition hover:bg-brand",
            showTeaser && "bg-brand text-white",
          )}
        >
          <Sparkles className="size-4 text-brand-lime" />
          <span className="truncate">{showTeaser ? teaserText : sellerAiConfig.widget.closedLabel}</span>
        </button>
      )}
    </div>
  );
}
