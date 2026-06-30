import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { getStorefrontFlow } from "@/lib/storefront-flow";

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;
  const store = await getPrisma().store.findUnique({ where: { slug: storeSlug } });
  if (!store || !store.isPublished) notFound();

  const product = await getPrisma().product.findUnique({
    where: { storeId_slug: { storeId: store.id, slug: productSlug } },
    include: { category: true },
  });
  if (!product || !product.isVisible) notFound();

  await trackEvent("PRODUCT_VIEW", store.id, product.id);
  const flow = getStorefrontFlow(store.plan);
  const productPriceLabel = formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  });

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <article className="mx-auto max-w-lg overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="aspect-square w-full object-cover" />
        <div className="p-5">
          <Link href={`/${store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-950">
            <ArrowLeft className="size-4" />
            Volver a tienda
          </Link>
          {product.isFeatured ? <span className="mt-4 inline-flex rounded-full bg-brand-lime px-2 py-1 text-[11px] font-black text-brand-dark">Destacado</span> : null}
          <h1 className="mt-4 text-3xl font-black">{product.name}</h1>
          <p className="mt-2 text-2xl font-black text-brand-dark">
            {productPriceLabel}
          </p>
          <p className="mt-4 leading-7 text-neutral-600">{product.description ?? "Consulta disponibilidad por WhatsApp."}</p>
          <ProductConversionCta
            storeSlug={store.slug}
            storePlan={store.plan}
            productId={product.id}
            productName={product.name}
            fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
            variant="product-page"
            className="mt-6"
          />
        </div>
      </article>
      {flow.sellerAiEnabled ? (
        <VisitorProvider>
          <SellerAiWidget
            storeSlug={store.slug}
            storeName={store.name}
            productId={product.id}
            productName={product.name}
            productImageUrl={product.imageUrl}
            productPriceLabel={productPriceLabel}
            categoryName={product.category?.name}
            whatsapp={store.whatsapp}
            planCode={flow.planCode}
            mode={flow.sellerAiMode}
            requirePhoneBeforeWhatsapp={flow.requirePhoneBeforeWhatsapp}
            initiallyHidden
            triggerLabel={flow.productPagePrimaryCta}
          />
        </VisitorProvider>
      ) : null}
    </main>
  );
}
