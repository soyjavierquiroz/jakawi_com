"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui";

type ShareTextButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function ShareTextButton({ value, label = "Copiar texto", copiedLabel = "Copiado", className }: ShareTextButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function resetStatusAfter(delay: number) {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), delay);
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setStatus("copied");
          resetStatusAfter(1400);
        } catch {
          setStatus("error");
          resetStatusAfter(1800);
        }
      }}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark transition hover:border-brand",
        status === "copied" && "border-brand bg-brand-soft",
        status === "error" && "border-red-200 bg-red-50 text-red-700",
        className,
      )}
    >
      <Copy className="size-4" />
      {status === "copied" ? copiedLabel : status === "error" ? "No se pudo copiar" : label}
    </button>
  );
}
