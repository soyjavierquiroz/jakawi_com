import type { CSSProperties } from "react";
import { ArrowLeft, MessageCircle, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { CommercialSpaceRenderer } from "@/components/storefront/templates/CommercialSpaceRenderer";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import { TikTokPixel } from "@/components/tracking/TikTokPixel";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
import { buildCommercialSpaceTheme, commercialThemeToCssVariables } from "@/lib/commercial-theme";
import { formatMoney } from "@/lib/money";
import { buildMetaPixelPageViewEvent, buildMetaPixelViewContentEvent, getActiveMetaPixelForStore } from "@/lib/pixels/meta-pixel";
import { buildTikTokPageViewEvent, buildTikTokViewContentEvent, getActiveTikTokPixelForStore } from "@/lib/pixels/tiktok-pixel";
import { getPrisma } from "@/lib/prisma";
import { getStorefrontFlow } from "@/lib/storefront-flow";
import { parseConsent, trackingConsentCookieName } from "@/lib/tracking/consent";

async function getRequestTrackingConsent() {
  try {
    const cookieStore = await cookies();
    return parseConsent(cookieStore.get(trackingConsentCookieName)?.value);
  } catch {
    return parseConsent();
  }
}

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
  const eventId = await trackEvent("STORE_VIEW", store.id);
  const consent = await getRequestTrackingConsent();
  const metaPixel = await getActiveMetaPixelForStore(store.id, { consent });
  const tiktokPixel = await getActiveTikTokPixelForStore(store.id, { consent });
  const theme = buildCommercialSpaceTheme(store);
  const themeStyle = commercialThemeToCssVariables(theme) as CSSProperties;

  return (
    <div style={themeStyle}>
      {metaPixel ? <MetaPixel pixelId={metaPixel.pixelId} event={buildMetaPixelPageViewEvent(eventId)} /> : null}
      {tiktokPixel ? <TikTokPixel pixelId={tiktokPixel.pixelId} event={buildTikTokPageViewEvent(eventId)} /> : null}
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

  const consent = await getRequestTrackingConsent();
  const eventId = await trackEvent("PRODUCT_VIEW", store.id, product.id, {
    consent,
    metadata: {
      product: {
        id: product.id,
        name: product.name,
        currency: store.currency ?? product.currency,
        valueCents: product.priceCents,
      },
    },
  });
  const metaPixel = await getActiveMetaPixelForStore(store.id, { consent });
  const tiktokPixel = await getActiveTikTokPixelForStore(store.id, { consent });
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
  const productImageUrl = product.imageUrl ?? "/placeholder-product.svg";
  const hasProductImage = Boolean(product.imageUrl);
  const productDescription = product.description?.trim() || "Consulta disponibilidad, detalles y entrega por WhatsApp antes de comprar.";

  return (
    <main style={themeStyle} className="min-h-dvh bg-[var(--space-background)] pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-[var(--space-background-contrast)] md:pb-12">
      {metaPixel ? (
        <MetaPixel
          pixelId={metaPixel.pixelId}
          event={buildMetaPixelViewContentEvent({
            eventId,
            productId: product.id,
            productName: product.name,
            currency: store.currency ?? product.currency,
            valueCents: product.priceCents,
          })}
        />
      ) : null}
      {tiktokPixel ? (
        <TikTokPixel
          pixelId={tiktokPixel.pixelId}
          event={buildTikTokViewContentEvent({
            eventId,
            productId: product.id,
            productName: product.name,
            currency: store.currency ?? product.currency,
            valueCents: product.priceCents,
          })}
        />
      ) : null}
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-12 max-w-5xl items-center justify-between gap-3">
          <Link href={storefrontHref} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--space-surface)] px-3 text-sm font-black text-[var(--space-surface-contrast)] ring-1 ring-[var(--space-border)] transition hover:bg-[var(--space-muted)]">
            <ArrowLeft className="size-4" />
            Volver al espacio
          </Link>
          <a href={`https://wa.me/${store.whatsapp}`} className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full bg-[var(--space-primary)] px-3 text-sm font-black text-[var(--space-primary-contrast)] transition hover:brightness-95">
            <MessageCircle className="size-4 shrink-0" />
            <span className="hidden truncate sm:inline">{store.name}</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      <article className="mx-auto mt-3 grid max-w-5xl gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)] md:items-start lg:px-8">
        <div className="overflow-hidden rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2 shadow-[0_18px_50px_rgb(0_0_0/0.12)]">
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[var(--space-muted)] md:aspect-square">
            {hasProductImage ? (
              <>
                <Image src={productImageUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="scale-110 object-cover opacity-20 blur-2xl" />
                <div className="absolute inset-0 bg-[var(--space-surface)]/20" />
                <Image src={productImageUrl} alt={product.name} fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="z-10 object-contain p-3" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--space-primary)_14%,var(--space-muted))_0%,var(--space-surface)_58%,color-mix(in_srgb,var(--space-accent)_20%,var(--space-muted))_100%)]" />
                <div className="relative z-10 grid h-full place-items-center">
                  <div className="grid size-20 place-items-center rounded-3xl bg-white/70 text-[var(--space-primary)] shadow-sm">
                    <ShoppingBag className="size-10" />
                  </div>
                </div>
                <Image src={productImageUrl} alt="" width={144} height={144} sizes="144px" unoptimized className="absolute bottom-5 right-5 h-20 w-20 object-contain opacity-45" />
              </>
            )}
          </div>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-4 text-[var(--space-surface-contrast)] shadow-sm md:sticky md:top-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {product.isFeatured ? <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
            {product.category ? <span className="inline-flex rounded-full bg-[var(--space-muted)] px-2.5 py-1 text-[11px] font-black opacity-75">{product.category.name}</span> : null}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-4 rounded-2xl bg-[var(--space-muted)] px-4 py-3">
            <p className="text-[11px] font-black uppercase opacity-60">Precio</p>
            <p className="text-3xl font-black text-[var(--space-primary)]">{productPriceLabel}</p>
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-black uppercase opacity-60">Detalle</h2>
            <p className="mt-2 leading-7 opacity-75">{productDescription}</p>
          </div>
          <div className="mt-6 hidden md:block">
            <ProductConversionCta
              storeSlug={store.slug}
              storePlan={store.plan}
              productId={product.id}
              productName={product.name}
              fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
              variant="product-page"
              primaryLabel="Te ayudo a elegir"
            />
            <p className="mt-3 text-sm font-semibold leading-6 opacity-65">Te contactamos por WhatsApp para confirmar disponibilidad y detalles.</p>
          </div>
        </div>
      </article>
      <div className="storefront-product-mobile-sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-[var(--space-border)] bg-[var(--space-surface)]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-16px_40px_rgb(0_0_0/0.16)] backdrop-blur-xl md:hidden">
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
