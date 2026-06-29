import { Mic } from "lucide-react";

export function TypingIndicator({ variant = "typing" }: { variant?: "typing" | "recording" }) {
  if (variant === "recording") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm font-black text-neutral-700 shadow-sm ring-1 ring-black/5">
        <Mic className="size-4 text-neutral-500" />
        <span>Seller AI está grabando un audio</span>
        <span className="jakawi-typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <span className="jakawi-typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
        <span className="jakawi-typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5" aria-label="Seller AI está escribiendo">
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
    </div>
  );
}
