"use client";

import { Check, ChevronDown, Play, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/ui";

type SellerAiTrustBubbleProps = {
  storeName: string;
  productName?: string;
  commercialType?: string | null;
  storageKey: string;
};

const TRUST_SCRIPT = "Soy el asistente de compras de esta tienda. Te ayudo a dejar clara tu consulta. La disponibilidad, el pago y la entrega los confirma el vendedor por WhatsApp.";

export function SellerAiTrustBubble({ storeName, productName, storageKey }: SellerAiTrustBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "hidden";
    } catch {
      return false;
    }
  });
  const [hasPlayed, setHasPlayed] = useState(false);

  const script = useMemo(() => {
    const subject = productName ? ` sobre ${productName}` : "";
    return TRUST_SCRIPT.replace("tu consulta", `tu consulta${subject}`);
  }, [productName]);

  function playTrustNote() {
    setHasPlayed(true);
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setIsExpanded(true);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = "es-BO";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsExpanded(true);
    }
  }

  function hideBubble() {
    setIsHidden(true);
    try {
      window.localStorage.setItem(storageKey, "hidden");
    } catch {
      // Preference storage is best effort.
    }
  }

  if (isHidden) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-brand-border bg-white px-3 py-2.5 text-neutral-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={playTrustNote} className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-dark text-white transition hover:bg-brand" aria-label="Reproducir cómo funciona esta compra">
            {hasPlayed ? <Volume2 className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>
          <button type="button" onClick={() => setIsExpanded((current) => !current)} className="min-w-0 flex-1 text-left" aria-expanded={isExpanded}>
            <span className="block truncate text-[14px] font-black leading-5 text-brand-dark">Cómo funciona esta compra · 0:12</span>
            <span className="block truncate text-[11px] font-semibold leading-4 text-neutral-500">{storeName}</span>
          </button>
          <button type="button" onClick={() => setIsExpanded((current) => !current)} className="grid size-8 shrink-0 place-items-center rounded-full text-neutral-500 transition hover:bg-brand-soft" aria-label="Ver texto">
            <ChevronDown className={cn("size-4 transition", isExpanded && "rotate-180")} />
          </button>
        </div>
        {isExpanded ? <p className="mt-2 text-[13px] font-semibold leading-5 text-neutral-600">{script}</p> : null}
        <button type="button" onClick={hideBubble} className="mt-2 inline-flex items-center gap-1 rounded-full px-0 text-[11px] font-black text-neutral-500 transition hover:text-brand-dark">
          <Check className="size-3.5" />
          No mostrar de nuevo
        </button>
      </div>
    </div>
  );
}
