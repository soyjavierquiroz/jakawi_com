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
        <a href={whatsappHref} className={cn("flex h-10 items-center justify-center rounded-md bg-brand text-center text-xs font-bold text-white transition hover:bg-brand-dark sm:text-sm", className)}>
          {flow.productCardCta}
        </a>
      );
    }

    return (
      <Link href={productHref ?? "#"} className={cn("flex h-10 items-center justify-center rounded-md border border-brand-border bg-white text-center text-xs font-black text-brand-dark transition hover:border-brand hover:bg-brand-soft sm:text-sm", className)}>
        {flow.productCardCta}
      </Link>
    );
  }

  if (!flow.sellerAiEnabled && flow.showProductPageDirectWhatsappButton && whatsappHref) {
    return (
      <a href={whatsappHref} className={cn("flex h-12 items-center justify-center gap-2 rounded-md bg-brand font-bold text-white transition hover:bg-brand-dark", className)}>
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
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-dark font-black text-white transition hover:bg-brand"
      >
        <Sparkles className="size-5 text-brand-lime" />
        {flow.productPagePrimaryCta}
      </button>

      {flow.showProductPageDirectWhatsappButton && flow.productPageSecondaryCta ? (
        flow.requirePhoneBeforeWhatsapp ? (
          <button
            type="button"
            onClick={() => openSellerAi(productId, productName, "whatsapp")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white font-bold text-brand-dark transition hover:border-brand hover:bg-brand-soft"
          >
            <MessageCircle className="size-4" />
            {flow.productPageSecondaryCta}
          </button>
        ) : whatsappHref ? (
          <a href={whatsappHref} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white font-bold text-brand-dark transition hover:border-brand hover:bg-brand-soft">
            <MessageCircle className="size-4" />
            {flow.productPageSecondaryCta}
          </a>
        ) : null
      ) : null}
    </div>
  );
}
