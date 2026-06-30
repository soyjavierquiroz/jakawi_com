import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { VisitorProvider } from "@/context/VisitorContext";
import { normalizeCommercialTemplate } from "@/config/commercial-templates";
import { getStorefrontFlow } from "@/lib/storefront-flow";
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

  return (
    <>
      <main className={flow.sellerAiEnabled ? "min-h-dvh bg-[var(--space-background)] pb-24 text-[var(--space-background-contrast)]" : "min-h-dvh bg-[var(--space-background)] pb-10 text-[var(--space-background-contrast)]"}>
        {template === "BOUTIQUE" ? <BoutiqueTemplate {...templateProps} /> : <ShowcaseTemplate {...templateProps} />}
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
            triggerLabel={flow.productPagePrimaryCta}
          />
        </VisitorProvider>
      ) : null}
    </>
  );
}
