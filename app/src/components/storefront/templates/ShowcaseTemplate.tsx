import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { CommercialCategoryChips, CommercialEmptyProducts, CommercialFooter, type CommercialTemplateProduct, type CommercialTemplateProps, type CommercialTemplateStore } from "@/components/storefront/templates/components";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/ui";

const SHOWCASE_TAGLINE_FALLBACK = "Compra guiada con contexto.";

type ShowcaseHeroVisual =
  | { type: "cover"; imageUrl: string }
  | { type: "product"; imageUrl: string; product: CommercialTemplateProduct }
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

function getShowcaseHeroVisual(store: CommercialTemplateStore, products: CommercialTemplateProduct[], featuredProduct?: CommercialTemplateProduct): ShowcaseHeroVisual {
  if (store.coverUrl) return { type: "cover", imageUrl: store.coverUrl };

  const visualProduct = featuredProduct?.imageUrl ? featuredProduct : products.find((product) => product.imageUrl);
  if (visualProduct?.imageUrl) return { type: "product", imageUrl: visualProduct.imageUrl, product: visualProduct };

  return { type: "gradient" };
}

function ShowcaseHero({
  store,
  products,
  featuredProduct,
  hasProducts,
}: {
  store: CommercialTemplateStore;
  products: CommercialTemplateProduct[];
  featuredProduct?: CommercialTemplateProduct;
  hasProducts: boolean;
}) {
  const visual = getShowcaseHeroVisual(store, products, featuredProduct);
  const whatsappHref = `https://wa.me/${store.whatsapp}`;

  return (
    <section className="relative isolate overflow-hidden rounded-b-[2.25rem] bg-[linear-gradient(145deg,var(--space-primary)_0%,#111827_68%,color-mix(in_srgb,var(--space-primary)_72%,#000)_100%)] text-[var(--space-primary-contrast)] shadow-[0_22px_60px_rgb(0_0_0/0.16)]">
      {visual.type === "cover" ? <img src={visual.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 saturate-110" /> : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,color-mix(in_srgb,var(--space-accent)_58%,transparent)_0%,transparent_28%),linear-gradient(180deg,rgba(0,0,0,.10)_0%,rgba(0,0,0,.34)_58%,rgba(0,0,0,.68)_100%)]" />

      <div className="relative mx-auto grid min-h-[500px] max-w-6xl gap-8 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+34px)] sm:min-h-[560px] sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] lg:items-center lg:px-8">
        <div className="flex max-w-2xl flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-black uppercase ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="size-3.5 text-[var(--space-accent)]" />
            Compra guiada
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] sm:text-6xl">{store.name}</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 opacity-90 sm:text-lg">{getShowcaseTagline(store)}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <a href={hasProducts ? "#productos" : whatsappHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--space-accent)] px-5 text-sm font-black text-[var(--space-accent-contrast)] shadow-sm transition hover:brightness-95">
              {hasProducts ? "Ver productos" : "Consultar"}
              <ArrowRight className="size-4" />
            </a>
            <a href={whatsappHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/12 px-5 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/18">
              <MessageCircle className="size-4" />
              Consultar
            </a>
          </div>
        </div>

        {visual.type === "product" ? (
          <Link href={`/${store.slug}/p/${visual.product.slug}`} className="mx-auto w-full max-w-[320px] self-center rounded-[2rem] border border-white/25 bg-white/14 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.24)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18 sm:max-w-[360px] lg:mx-0 lg:justify-self-end">
            <div className="relative isolate aspect-[3/4] overflow-hidden rounded-[1.55rem] bg-white/12">
              <img src={visual.imageUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.24] blur-2xl" />
              <img src={visual.imageUrl} alt="" className="relative z-10 h-full w-full object-contain p-2" />
            </div>
            <div className="px-2 pb-1 pt-3">
              <p className="text-[11px] font-black uppercase text-[var(--space-accent)]">Selección principal</p>
              <p className="mt-1 line-clamp-2 text-lg font-black leading-tight">{visual.product.name}</p>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ShowcaseProductImage({ product, featured = false }: { product: CommercialTemplateProduct; featured?: boolean }) {
  const imageUrl = product.imageUrl ?? "/placeholder-product.svg";

  return (
    <div className={cn("relative isolate overflow-hidden bg-[var(--space-muted)]", featured ? "aspect-[4/3] rounded-[1.35rem]" : "aspect-[4/3] rounded-xl")}>
      <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.22] blur-2xl" />
      <div className="absolute inset-0 bg-white/[0.04]" />
      <img src={imageUrl} alt="" className={cn("relative z-10 h-full w-full", featured ? "object-contain p-2" : "object-cover")} />
    </div>
  );
}

function ShowcaseFeaturedProduct({ store, product }: { store: CommercialTemplateStore; product: CommercialTemplateProduct }) {
  const productHref = `/${store.slug}/p/${product.slug}`;
  const price = getShowcasePrice(store, product);

  return (
    <section className="mt-7">
      <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Selección principal</p>
      <h2 className="mt-1 text-2xl font-black leading-tight">Producto destacado</h2>
      <article className="mt-4 overflow-hidden rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2.5 text-[var(--space-surface-contrast)] shadow-[0_18px_52px_rgb(0_0_0/0.12)]">
        <Link href={productHref} className="block">
          <ShowcaseProductImage product={product} featured />
        </Link>
        <div className="px-2 pb-2 pt-3 sm:px-3">
          <span className="inline-flex w-fit rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span>
          <Link href={productHref}>
            <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{product.name}</h3>
          </Link>
          <p className="mt-2 text-2xl font-black text-[var(--space-primary)]">{price}</p>
          {product.description ? <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 opacity-70">{product.description}</p> : null}
          <Link href={productHref} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--space-primary)] px-5 text-sm font-black text-[var(--space-primary-contrast)] transition hover:brightness-95">
            Ver producto
            <ArrowRight className="size-4" />
          </Link>
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
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {products.map((product) => {
          const productHref = `/${store.slug}/p/${product.slug}`;
          return (
            <article key={product.id} className="overflow-hidden rounded-[1.15rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-2 text-[var(--space-surface-contrast)] shadow-sm">
              <Link href={productHref} className="block">
                <ShowcaseProductImage product={product} />
              </Link>
              <div className="px-1 pb-1 pt-2">
                {product.isFeatured ? <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2 py-0.5 text-[10px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
                <Link href={productHref}>
                  <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 sm:text-base sm:leading-6">{product.name}</h3>
                </Link>
                <p className="mt-1 text-base font-black text-[var(--space-primary)] sm:text-lg">{getShowcasePrice(store, product)}</p>
                <Link href={productHref} className="mt-3 flex h-10 items-center justify-center rounded-full border border-[var(--space-border)] bg-[var(--space-surface)] text-xs font-black transition hover:bg-[var(--space-muted)]">
                  Ver producto
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ShowcaseTemplate({ store, categories, products }: CommercialTemplateProps) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const featuredProduct = featuredProducts[0] ?? products[0];
  const remainingProducts = featuredProduct ? products.filter((product) => product.id !== featuredProduct.id) : [];

  return (
    <>
      <ShowcaseHero store={store} products={products} featuredProduct={featuredProduct} hasProducts={products.length > 0} />

      <section id="productos" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
        <CommercialCategoryChips categories={categories} variant="showcase" />
        {products.length === 0 ? <CommercialEmptyProducts /> : null}
        {featuredProduct ? <ShowcaseFeaturedProduct store={store} product={featuredProduct} /> : null}
        {remainingProducts.length > 0 ? <ShowcaseProductGrid store={store} products={remainingProducts} title="También disponible" /> : null}
        <CommercialFooter />
      </section>
    </>
  );
}
