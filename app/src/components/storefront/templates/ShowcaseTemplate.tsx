import { ArrowRight, MessageCircle, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { CommercialCategoryChips, CommercialEmptyProducts, CommercialFooter, type CommercialTemplateProduct, type CommercialTemplateProps, type CommercialTemplateStore } from "@/components/storefront/templates/components";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/ui";

const SHOWCASE_TAGLINE_FALLBACK = "Catalogo claro, consulta directa y compra por WhatsApp.";

type ShowcaseHeroVisual =
  | { type: "cover"; imageUrl: string }
  | { type: "gradient" };

function getShowcaseTagline(store: CommercialTemplateStore) {
  return store.commercialTagline?.trim() || SHOWCASE_TAGLINE_FALLBACK;
}

function getShowcasePrice(store: CommercialTemplateStore, product: CommercialTemplateProduct) {
  return formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  });
}

function getShowcaseHeroVisual(store: CommercialTemplateStore): ShowcaseHeroVisual {
  if (store.coverUrl) return { type: "cover", imageUrl: store.coverUrl };
  return { type: "gradient" };
}

function ShowcaseHero({
  store,
  hasProducts,
}: {
  store: CommercialTemplateStore;
  hasProducts: boolean;
}) {
  const visual = getShowcaseHeroVisual(store);

  return (
    <section className="relative isolate h-[clamp(320px,42svh,430px)] overflow-hidden rounded-b-[2rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--space-primary)_92%,#000)_0%,#111827_58%,color-mix(in_srgb,var(--space-primary)_62%,var(--space-accent))_100%)] text-[var(--space-primary-contrast)] shadow-[0_18px_46px_rgb(0_0_0/0.12)] md:mx-auto md:mt-4 md:h-[440px] md:max-w-6xl md:rounded-[1.75rem] lg:h-[480px]">
      {visual.type === "cover" ? <Image src={visual.imageUrl} alt="" fill sizes="(min-width: 768px) 1152px, 100vw" unoptimized className="object-cover saturate-105" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,.08)_46%,rgba(0,0,0,.50)_100%)]" />

      <div className="relative mx-auto flex h-full max-w-6xl items-end px-5 pb-8 pt-[calc(env(safe-area-inset-top)+24px)] sm:px-8 md:pb-10 md:pt-[calc(env(safe-area-inset-top)+34px)] lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-white/16 px-3 py-1.5 text-[11px] font-black uppercase ring-1 ring-white/25 backdrop-blur">Tienda verificada</span>
          <h1 className="text-[2.35rem] font-black leading-[1.02] drop-shadow-[0_2px_14px_rgb(0_0_0/0.34)] sm:text-5xl md:text-6xl">{store.name}</h1>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm font-semibold leading-6 opacity-95 drop-shadow-[0_2px_10px_rgb(0_0_0/0.30)] sm:text-base md:text-lg md:leading-7">{getShowcaseTagline(store)}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={hasProducts ? "#productos" : `https://wa.me/${store.whatsapp}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--space-accent)] px-4 text-sm font-black text-[var(--space-accent-contrast)] shadow-sm transition hover:brightness-95">
              {hasProducts ? "Ver productos" : "Consultar por WhatsApp"}
              <ArrowRight className="size-4" />
            </a>
            <a href={`https://wa.me/${store.whatsapp}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/16 px-4 text-sm font-black text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/22">
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseProductImage({ product, featured = false }: { product: CommercialTemplateProduct; featured?: boolean }) {
  const hasImage = Boolean(product.imageUrl);
  const imageUrl = product.imageUrl ?? "/placeholder-product.svg";

  return (
    <div className={cn("relative isolate overflow-hidden bg-[var(--space-muted)]", featured ? "aspect-[4/3] rounded-[1.35rem]" : "aspect-[4/3] rounded-xl")}>
      {hasImage ? (
        <Image src={imageUrl} alt={product.name} fill sizes={featured ? "(min-width: 768px) 640px, 100vw" : "(min-width: 768px) 33vw, 100vw"} unoptimized className="object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--space-primary)_14%,var(--space-muted))_0%,var(--space-surface)_58%,color-mix(in_srgb,var(--space-accent)_20%,var(--space-muted))_100%)]" />
          <div className="relative z-10 grid h-full place-items-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-white/70 text-[var(--space-primary)] shadow-sm">
              <ShoppingBag className="size-8" />
            </div>
          </div>
          <Image src={imageUrl} alt="" width={116} height={116} sizes="116px" unoptimized className="absolute bottom-4 right-4 h-16 w-16 object-contain opacity-45" />
        </>
      )}
    </div>
  );
}

function ShowcaseFeaturedProduct({ store, product }: { store: CommercialTemplateStore; product: CommercialTemplateProduct }) {
  const productHref = `/${store.slug}/p/${product.slug}`;
  const price = getShowcasePrice(store, product);
  const description = product.description ?? "Consulta disponibilidad, detalles y entrega antes de comprar.";

  return (
    <section className="mt-7">
      <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Selección principal</p>
      <h2 className="mt-1 text-2xl font-black leading-tight">Producto destacado</h2>
      <article className="mt-4 overflow-hidden rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2 text-[var(--space-surface-contrast)] shadow-[0_18px_52px_rgb(0_0_0/0.12)]">
        <Link href={productHref} className="block">
          <ShowcaseProductImage product={product} featured />
        </Link>
        <div className="px-2 pb-2 pt-3 sm:px-3">
          <span className="inline-flex w-fit rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span>
          <Link href={productHref}>
            <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{product.name}</h3>
          </Link>
          <div className="mt-3 rounded-xl bg-[var(--space-muted)] px-3 py-2">
            <p className="text-[10px] font-black uppercase opacity-60">Precio</p>
            <p className="text-2xl font-black text-[var(--space-primary)]">{price}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 opacity-70">{description}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <ProductConversionCta
              storeSlug={store.slug}
              storePlan={store.plan}
              productId={product.id}
              productName={product.name}
              productHref={productHref}
              fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
              variant="card"
            />
            <Link href={productHref} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--space-border)] bg-[var(--space-surface)] px-5 text-sm font-black text-[var(--space-surface-contrast)] transition hover:bg-[var(--space-muted)] sm:w-auto">
              Ver detalle
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}

function ShowcaseProductGrid({ store, products, title }: { store: CommercialTemplateStore; products: CommercialTemplateProduct[]; title: string }) {
  if (products.length === 0) return null;

  return (
    <section className="mt-7">
      <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Más productos</p>
      <h2 className="mt-1 text-2xl font-black leading-tight">{title}</h2>
      <div className="mt-4 grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3">
        {products.map((product) => {
          const productHref = `/${store.slug}/p/${product.slug}`;
          return (
            <article key={product.id} className="flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2 text-[var(--space-surface-contrast)] shadow-sm">
              <Link href={productHref} className="block">
                <ShowcaseProductImage product={product} />
              </Link>
              <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
                {product.isFeatured ? <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2 py-0.5 text-[10px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
                <Link href={productHref}>
                  <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 sm:text-base sm:leading-6">{product.name}</h3>
                </Link>
                <div className="mt-2 rounded-xl bg-[var(--space-muted)] px-2.5 py-2">
                  <p className="text-[10px] font-black uppercase opacity-60">Precio</p>
                  <p className="text-base font-black text-[var(--space-primary)] sm:text-lg">{getShowcasePrice(store, product)}</p>
                </div>
                <ProductConversionCta
                  storeSlug={store.slug}
                  storePlan={store.plan}
                  productId={product.id}
                  productName={product.name}
                  productHref={productHref}
                  fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
                  variant="card"
                  className="mt-3"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ShowcaseTemplate({ store, categories, products, flow }: CommercialTemplateProps) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const featuredProduct = featuredProducts[0] ?? products[0];
  const remainingProducts = featuredProduct ? products.filter((product) => product.id !== featuredProduct.id) : [];
  const showStickyAssistedCta = flow.sellerAiEnabled && Boolean(featuredProduct);

  return (
    <>
      <ShowcaseHero store={store} hasProducts={products.length > 0} />

      <section id="productos" className={cn("mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8", showStickyAssistedCta && "pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0")}>
        <CommercialCategoryChips categories={categories} variant="showcase" />
        {products.length === 0 ? <CommercialEmptyProducts store={store} /> : null}
        {featuredProduct ? <ShowcaseFeaturedProduct store={store} product={featuredProduct} /> : null}
        {remainingProducts.length > 0 ? <ShowcaseProductGrid store={store} products={remainingProducts} title="También disponible" /> : null}
        <CommercialFooter />
      </section>

      {showStickyAssistedCta && featuredProduct ? (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[var(--space-background)] via-[var(--space-background)]/96 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-8 md:hidden">
          <div className="mx-auto max-w-md">
            <ProductConversionCta
              storeSlug={store.slug}
              storePlan={store.plan}
              productId={featuredProduct.id}
              productName={featuredProduct.name}
              fallbackWhatsappHref={`/api/whatsapp/click?productId=${featuredProduct.id}`}
              variant="product-page"
              primaryLabel="Hablemos, te ayudo a elegir"
              hideSecondaryCta
              className="showcase-assisted-sticky-cta showcase-assisted-sticky-cta-pulse"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
