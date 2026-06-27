export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
      <span className="jakawi-typing-dot h-2 w-2 rounded-full bg-brand-dark/40" />
    </div>
  );
}
