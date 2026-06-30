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
  onOpenSellerAi?: () => void;
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
  onOpenSellerAi,
}: ProductConversionCtaProps) {
  const flow = getStorefrontFlow(storePlan);
  const whatsappHref = fallbackWhatsappHref ?? (productId ? `/api/whatsapp/click?productId=${productId}` : undefined);
  const isCard = variant === "card";

  if (isCard) {
    if (flow.showProductCardWhatsappButton && whatsappHref) {
      return (
        <a href={whatsappHref} className={cn("flex h-10 items-center justify-center rounded-md bg-[var(--space-primary)] text-center text-xs font-bold text-[var(--space-primary-contrast)] transition hover:brightness-95 sm:text-sm", className)}>
          {flow.productCardCta}
        </a>
      );
    }

    return (
      <Link href={productHref ?? "#"} className={cn("flex h-10 items-center justify-center rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] text-center text-xs font-black text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)] sm:text-sm", className)}>
        {flow.productCardCta}
      </Link>
    );
  }

  if (!flow.sellerAiEnabled && flow.showProductPageDirectWhatsappButton && whatsappHref) {
    return (
      <a href={whatsappHref} className={cn("flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--space-primary)] font-bold text-[var(--space-primary-contrast)] transition hover:brightness-95", className)}>
        <MessageCircle className="size-5" />
        {flow.productPagePrimaryCta}
      </a>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => {
          onOpenSellerAi?.();
          openSellerAi(productId, productName, "chat");
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--space-primary)] font-black text-[var(--space-primary-contrast)] transition hover:brightness-95"
      >
        <Sparkles className="size-5 text-[var(--space-accent)]" />
        {flow.productPagePrimaryCta}
      </button>

      {flow.showProductPageDirectWhatsappButton && flow.productPageSecondaryCta ? (
        flow.requirePhoneBeforeWhatsapp ? (
          <button
            type="button"
            onClick={() => openSellerAi(productId, productName, "whatsapp")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] font-bold text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)]"
          >
            <MessageCircle className="size-4" />
            {flow.productPageSecondaryCta}
          </button>
        ) : whatsappHref ? (
          <a href={whatsappHref} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] font-bold text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)]">
            <MessageCircle className="size-4" />
            {flow.productPageSecondaryCta}
          </a>
        ) : null
      ) : null}
    </div>
  );
}
