"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { getStorefrontFlow } from "@/lib/storefront-flow";
import { cn } from "@/lib/ui";

type ProductConversionCtaProps = {
  storeSlug: string;
  storePlan: string | null | undefined;
  productId?: string;
  productName?: string;
  className?: string;
  variant?: "card" | "product-page";
  fallbackWhatsappHref?: string;
  productHref?: string;
  primaryLabel?: string;
  hideSecondaryCta?: boolean;
  onOpenSellerAi?: () => void;
  layout?: "stacked" | "inline";
};

function openSellerAi(productId?: string, productName?: string, action: "chat" | "whatsapp" = "chat") {
  window.dispatchEvent(
    new CustomEvent("jakawi:seller-ai-open", {
      detail: { productId, productName, action },
    }),
  );
}

export function ProductConversionCta({
  storePlan,
  productId,
  productName,
  className,
  variant = "product-page",
  fallbackWhatsappHref,
  productHref,
  primaryLabel,
  hideSecondaryCta = false,
  onOpenSellerAi,
  layout = "stacked",
}: ProductConversionCtaProps) {
  const flow = getStorefrontFlow(storePlan);
  const whatsappHref = fallbackWhatsappHref ?? (productId ? `/api/whatsapp/click?productId=${productId}` : undefined);
  const isCard = variant === "card";
  const isInline = layout === "inline";
  const hasSecondaryCta = !hideSecondaryCta && flow.showProductPageDirectWhatsappButton && Boolean(flow.productPageSecondaryCta);

  if (isCard) {
    if (flow.showProductCardWhatsappButton && whatsappHref) {
      return (
        <a href={whatsappHref} className={cn("flex h-11 items-center justify-center rounded-full bg-[var(--space-primary)] text-center text-xs font-black text-[var(--space-primary-contrast)] transition hover:brightness-95 sm:text-sm", className)}>
          {flow.productCardCta}
        </a>
      );
    }

    return (
      <Link href={productHref ?? "#"} className={cn("flex h-11 items-center justify-center rounded-full border border-[var(--space-border)] bg-[var(--space-surface)] text-center text-xs font-black text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)] sm:text-sm", className)}>
        {flow.productCardCta}
      </Link>
    );
  }

  if (!flow.sellerAiEnabled && flow.showProductPageDirectWhatsappButton && whatsappHref) {
    return (
      <a
        href={whatsappHref}
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--space-primary)] font-bold text-[var(--space-primary-contrast)] transition hover:brightness-95",
          isInline && "w-full rounded-full bg-neutral-950 px-4 text-sm font-black text-white shadow-[0_14px_30px_rgb(0_0_0/0.2)] active:scale-[0.98]",
          className,
        )}
      >
        <MessageCircle className="size-5" />
        {flow.productPagePrimaryCta}
      </a>
    );
  }

  return (
    <div className={cn(isInline && hasSecondaryCta ? "grid grid-cols-[minmax(0,1fr)_minmax(104px,0.82fr)] gap-2" : isInline ? "grid grid-cols-1" : "space-y-3", className)}>
      <button
        type="button"
        onClick={() => {
          onOpenSellerAi?.();
          openSellerAi(productId, productName, "chat");
        }}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--space-primary)] font-black text-[var(--space-primary-contrast)] transition hover:brightness-95",
          isInline && "min-w-0 rounded-full bg-neutral-950 px-3 text-sm text-white shadow-[0_14px_30px_rgb(0_0_0/0.2),0_0_20px_rgb(0_0_0/0.12)] active:scale-[0.98]",
        )}
      >
        <Sparkles className={cn("size-5 text-[var(--space-accent)]", isInline && "size-4 shrink-0 text-amber-200")} />
        <span className="min-w-0 whitespace-nowrap">{primaryLabel ?? flow.productPagePrimaryCta}</span>
      </button>

      {hasSecondaryCta && flow.productPageSecondaryCta ? (
        flow.requirePhoneBeforeWhatsapp ? (
          <button
            type="button"
            onClick={() => openSellerAi(productId, productName, "whatsapp")}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] font-bold text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)]",
              isInline && "h-12 min-w-0 rounded-full px-2 text-xs shadow-sm active:scale-[0.98] min-[380px]:px-3 min-[380px]:text-sm",
            )}
          >
            <MessageCircle className="size-4 shrink-0" />
            {isInline ? (
              <>
                <span className="hidden min-[380px]:inline">{flow.productPageSecondaryCta}</span>
                <span className="min-[380px]:hidden">WhatsApp</span>
              </>
            ) : (
              flow.productPageSecondaryCta
            )}
          </button>
        ) : whatsappHref ? (
          <a
            href={whatsappHref}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] font-bold text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)]",
              isInline && "h-12 min-w-0 rounded-full px-2 text-xs shadow-sm active:scale-[0.98] min-[380px]:px-3 min-[380px]:text-sm",
            )}
          >
            <MessageCircle className="size-4 shrink-0" />
            {isInline ? (
              <>
                <span className="hidden min-[380px]:inline">{flow.productPageSecondaryCta}</span>
                <span className="min-[380px]:hidden">WhatsApp</span>
              </>
            ) : (
              flow.productPageSecondaryCta
            )}
          </a>
        ) : null
      ) : null}
    </div>
  );
}
