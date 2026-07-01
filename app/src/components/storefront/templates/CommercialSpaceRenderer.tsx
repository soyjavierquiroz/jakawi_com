import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { VisitorProvider } from "@/context/VisitorContext";
import { normalizeCommercialTemplate } from "@/config/commercial-templates";
import { getStorefrontFlow } from "@/lib/storefront-flow";
import { formatMoney } from "@/lib/money";
import { AppCommerceTemplate } from "@/components/storefront/templates/AppCommerceTemplate";
import { BoutiqueTemplate } from "@/components/storefront/templates/BoutiqueTemplate";
import { ShowcaseTemplate } from "@/components/storefront/templates/ShowcaseTemplate";
import type { CommercialTemplateCategory, CommercialTemplateProduct, CommercialTemplateStore } from "@/components/storefront/templates/components";

type CommercialSpaceRendererProps = {
  store: CommercialTemplateStore;
  categories: CommercialTemplateCategory[];
  products: CommercialTemplateProduct[];
};

export function CommercialSpaceRenderer({ store, categories, products }: CommercialSpaceRendererProps) {
  const flow = getStorefrontFlow(store.plan);
  const template = normalizeCommercialTemplate(store.commercialTemplate);
  const templateProps = { store, categories, products, flow };
  const hideInitialSellerAiTrigger = template === "APP_COMMERCE" || (template === "SHOWCASE" && products.length > 0);
  const showcaseContextProduct = template === "SHOWCASE" ? (products.find((product) => product.isFeatured) ?? products[0]) : undefined;
  const showcaseContextPriceLabel = showcaseContextProduct
    ? formatMoney({
        amountCents: showcaseContextProduct.priceCents,
        currency: store.currency ?? showcaseContextProduct.currency,
        countryCode: store.countryCode ?? "BO",
        locale: store.locale,
      })
    : undefined;

  return (
    <>
      <main className={flow.sellerAiEnabled ? "min-h-dvh bg-[var(--space-background)] pb-24 text-[var(--space-background-contrast)]" : "min-h-dvh bg-[var(--space-background)] pb-10 text-[var(--space-background-contrast)]"}>
        {template === "APP_COMMERCE" ? <AppCommerceTemplate {...templateProps} /> : template === "BOUTIQUE" ? <BoutiqueTemplate {...templateProps} /> : <ShowcaseTemplate {...templateProps} />}
      </main>

      {flow.sellerAiEnabled ? (
        <VisitorProvider>
          <SellerAiWidget
            storeSlug={store.slug}
            storeName={store.name}
            whatsapp={store.whatsapp}
            planCode={flow.planCode}
            mode={flow.sellerAiMode}
            requirePhoneBeforeWhatsapp={flow.requirePhoneBeforeWhatsapp}
            initiallyHidden={hideInitialSellerAiTrigger}
            triggerLabel={flow.productPagePrimaryCta}
            productId={showcaseContextProduct?.id}
            productName={showcaseContextProduct?.name}
            productImageUrl={showcaseContextProduct?.imageUrl}
            productPriceLabel={showcaseContextPriceLabel}
            categoryName={showcaseContextProduct?.category?.name}
          />
        </VisitorProvider>
      ) : null}
    </>
  );
}
