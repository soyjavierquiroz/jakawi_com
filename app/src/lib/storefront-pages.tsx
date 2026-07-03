import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { CommercialSpaceRenderer } from "@/components/storefront/templates/CommercialSpaceRenderer";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
import { buildCommercialSpaceTheme, commercialThemeToCssVariables } from "@/lib/commercial-theme";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { getStorefrontFlow } from "@/lib/storefront-flow";

export async function renderStorefrontBySlug(storeSlug: string) {
  const store = await getPrisma().store.findUnique({
    where: { slug: storeSlug },
    include: {
      categories: { orderBy: { name: "asc" } },
      products: {
        where: { isVisible: true },
        include: { category: true },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!store || !store.isPublished) notFound();
  await trackEvent("STORE_VIEW", store.id);
  const theme = buildCommercialSpaceTheme(store);
  const themeStyle = commercialThemeToCssVariables(theme) as CSSProperties;

  return (
    <div style={themeStyle}>
      <CommercialSpaceRenderer store={store} categories={store.categories} products={store.products} />
    </div>
  );
}

export async function renderProductBySlug(storeSlug: string, productSlug: string, options: { directHost?: boolean } = {}) {
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
  const storefrontHref = options.directHost ? "/" : `/${store.slug}`;

  return (
    <main style={themeStyle} className="min-h-dvh bg-[var(--space-background)] pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-[var(--space-background-contrast)] md:pb-12">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-12 max-w-5xl items-center justify-between gap-3">
          <Link href={storefrontHref} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--space-surface)] px-3 text-sm font-black text-[var(--space-surface-contrast)] ring-1 ring-[var(--space-border)] transition hover:bg-[var(--space-muted)]">
            <ArrowLeft className="size-4" />
            Volver al espacio
          </Link>
          <span className="min-w-0 truncate text-sm font-black text-[var(--space-primary)]">{store.name}</span>
        </div>
      </header>

      <article className="mx-auto mt-3 grid max-w-5xl gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)] md:items-start lg:px-8">
        <div className="overflow-hidden rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2 shadow-[0_18px_50px_rgb(0_0_0/0.12)]">
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[var(--space-muted)] md:aspect-square">
            <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-4 text-[var(--space-surface-contrast)] shadow-sm md:p-5">
          {product.isFeatured ? <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-3xl font-black text-[var(--space-primary)]">{productPriceLabel}</p>
          <p className="mt-4 leading-7 opacity-75">{product.description ?? "Consulta disponibilidad y detalles antes de comprar."}</p>
          <ProductConversionCta
            storeSlug={store.slug}
            storePlan={store.plan}
            productId={product.id}
            productName={product.name}
            fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
            variant="product-page"
            primaryLabel="Te ayudo a elegir"
            className="mt-6 hidden md:block"
          />
        </div>
      </article>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--space-border)] bg-[var(--space-surface)]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-16px_40px_rgb(0_0_0/0.16)] backdrop-blur-xl md:hidden">
        <div className="mx-auto max-w-md">
          <ProductConversionCta
            storeSlug={store.slug}
            storePlan={store.plan}
            productId={product.id}
            productName={product.name}
            fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
            variant="product-page"
            primaryLabel="Te ayudo a elegir"
            layout="inline"
          />
        </div>
      </div>
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
