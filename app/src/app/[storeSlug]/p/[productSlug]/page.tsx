import type { CSSProperties } from "react";
import { ArrowLeft, BadgeCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
import { buildCommercialSpaceTheme, commercialThemeToCssVariables } from "@/lib/commercial-theme";
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
  const theme = buildCommercialSpaceTheme(store);
  const themeStyle = commercialThemeToCssVariables(theme) as CSSProperties;
  const productPriceLabel = formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  });

  return (
    <main style={themeStyle} className="min-h-dvh bg-[var(--space-background)] pb-24 text-[var(--space-background-contrast)]">
      <section className="rounded-b-[2rem] bg-[var(--space-primary)] px-4 pb-16 pt-6 text-[var(--space-primary-contrast)] shadow-sm">
        <div className="mx-auto max-w-5xl">
          <Link href={`/${store.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-3 text-sm font-black transition hover:bg-white/18">
            <ArrowLeft className="size-4" />
            Volver al espacio
          </Link>
          <div className="mt-5 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-black ring-1 ring-white/18">
              <BadgeCheck className="size-4 text-[var(--space-accent)]" />
              {store.name}
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-3 text-2xl font-black text-[var(--space-accent)]">{productPriceLabel}</p>
          </div>
        </div>
      </section>

      <article className="mx-auto -mt-10 grid max-w-5xl gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] p-3 shadow-[0_18px_50px_rgb(0_0_0/0.12)]">
          <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="aspect-[4/3] w-full rounded-xl bg-[var(--space-muted)] object-cover md:aspect-square" />
        </div>
        <div className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] p-5 text-[var(--space-surface-contrast)] shadow-sm md:p-6">
          {product.isFeatured ? <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
          <h2 className="mt-4 text-2xl font-black leading-tight">{product.name}</h2>
          <p className="mt-2 text-3xl font-black text-[var(--space-primary)]">{productPriceLabel}</p>
          <p className="mt-4 leading-7 opacity-75">{product.description ?? "Consulta disponibilidad por WhatsApp."}</p>
          {flow.sellerAiEnabled ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--space-muted)] px-3 py-2 text-sm font-black">
              <Sparkles className="size-4 text-[var(--space-primary)]" />
              Te ayudamos a elegir antes de WhatsApp.
            </p>
          ) : null}
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
