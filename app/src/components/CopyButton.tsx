"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label="Copiar link"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-semibold text-white transition hover:bg-brand"
    >
      <Copy className="size-4" />
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
