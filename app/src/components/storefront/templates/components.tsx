import { ArrowRight, Camera, MessageCircle, Music2, Sparkles } from "lucide-react";
import Link from "next/link";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { formatMoney } from "@/lib/money";
import type { StorefrontFlow } from "@/lib/storefront-flow";
import { cn } from "@/lib/ui";

export type CommercialTemplateCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CommercialTemplateProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isFeatured: boolean;
  category: CommercialTemplateCategory | null;
};

export type CommercialTemplateStore = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  commercialTagline: string | null;
  whatsapp: string;
  instagram: string | null;
  tiktok: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  countryCode: string | null;
  currency: string | null;
  locale: string | null;
  plan: string;
  commercialTemplate?: string | null;
};

export type CommercialTemplateProps = {
  store: CommercialTemplateStore;
  categories: CommercialTemplateCategory[];
  products: CommercialTemplateProduct[];
  flow: StorefrontFlow;
};

type CommercialHeroProps = {
  store: CommercialTemplateStore;
  flow: StorefrontFlow;
  variant: "showcase" | "boutique";
  featuredProduct?: CommercialTemplateProduct;
};

function getFallbackDescription(store: CommercialTemplateStore) {
  return store.description ?? "Espacio comercial creado con JAKAWI.";
}

function getHeroImage(store: CommercialTemplateStore, featuredProduct?: CommercialTemplateProduct) {
  return store.coverUrl ?? featuredProduct?.imageUrl ?? null;
}

function getProductPrice(store: CommercialTemplateStore, product: CommercialTemplateProduct) {
  return formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  });
}

function StoreMark({ store, variant }: { store: CommercialTemplateStore; variant: "showcase" | "boutique" }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center overflow-hidden text-sm font-black", variant === "boutique" ? "rounded-full bg-white/80 text-[var(--space-primary)]" : "rounded-xl bg-white/16 text-white ring-1 ring-white/20")}>
      {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : store.name.charAt(0)}
    </span>
  );
}

export function CommercialHero({ store, flow, variant, featuredProduct }: CommercialHeroProps) {
  const hasProducts = Boolean(featuredProduct);
  const isBoutique = variant === "boutique";
  const heroImage = getHeroImage(store, featuredProduct);

  return (
    <section
      className={cn(
        "relative overflow-hidden text-[var(--space-primary-contrast)]",
        isBoutique ? "rounded-b-[2.75rem] bg-[radial-gradient(circle_at_78%_12%,var(--space-accent)_0%,transparent_30%),linear-gradient(145deg,var(--space-background)_0%,var(--space-surface)_55%,var(--space-background)_100%)] text-[var(--space-background-contrast)]" : "rounded-b-[2.35rem] bg-[linear-gradient(145deg,var(--space-primary)_0%,#111827_100%)]",
      )}
    >
      {heroImage ? (
        <img
          src={heroImage}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover", isBoutique ? "opacity-28 saturate-110" : "opacity-58 saturate-110")}
        />
      ) : null}
      <div className={cn("absolute inset-0", isBoutique ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--space-background)_92%,transparent)_0%,color-mix(in_srgb,var(--space-background)_55%,transparent)_44%,var(--space-background)_100%)]" : "bg-[linear-gradient(180deg,rgba(0,0,0,.35)_0%,rgba(0,0,0,.10)_40%,rgba(0,0,0,.72)_100%)]")} />

      <div className="relative mx-auto flex min-h-[360px] max-w-6xl flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top)+14px)] sm:min-h-[430px] sm:px-6 lg:min-h-[480px] lg:px-8">
        <div className={cn("flex items-center justify-between gap-3 rounded-full px-2.5 py-2 backdrop-blur", isBoutique ? "bg-white/60 text-[var(--space-background-contrast)] ring-1 ring-white/60" : "bg-black/15 text-white ring-1 ring-white/20")}>
          <div className="flex min-w-0 items-center gap-2">
            <StoreMark store={store} variant={variant} />
            <span className="truncate text-sm font-black">{store.name}</span>
          </div>
          <a
            href={`https://wa.me/${store.whatsapp}`}
            className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-black transition hover:brightness-95", isBoutique ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)]" : "bg-[var(--space-accent)] text-[var(--space-accent-contrast)]")}
          >
            <MessageCircle className="size-3.5" />
            WhatsApp
          </a>
        </div>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(310px,410px)] lg:items-end">
          <div className="flex max-w-2xl flex-col justify-end self-end">
          <span
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 backdrop-blur",
              isBoutique ? "bg-white/60 text-[var(--space-primary)] ring-white/60" : "bg-white/15 ring-white/20",
            )}
          >
            <Sparkles className={cn("size-3.5", isBoutique ? "text-[var(--space-primary)]" : "text-[var(--space-accent)]")} />
            {flow.sellerAiEnabled ? (isBoutique ? "Selección guiada" : "Compra guiada") : "Consulta por WhatsApp"}
          </span>
          <h1 className={cn("mt-5 text-4xl font-black leading-[1.02] sm:text-6xl", isBoutique && "max-w-xl font-serif")}>{store.name}</h1>
          <p className={cn("mt-4 line-clamp-3 max-w-xl text-base font-semibold leading-7 opacity-90 sm:text-lg", isBoutique && "opacity-75")}>{getFallbackDescription(store)}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <a
              href={hasProducts ? "#productos" : `https://wa.me/${store.whatsapp}`}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black shadow-sm transition hover:brightness-95",
                isBoutique
                  ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)]"
                  : "bg-[var(--space-accent)] text-[var(--space-accent-contrast)]",
              )}
            >
              {hasProducts ? "Ver productos" : "Consultar por WhatsApp"}
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

        {featuredProduct ? (
          <Link
            href={`/${store.slug}/p/${featuredProduct.slug}`}
            className={cn(
              "hidden overflow-hidden rounded-[1.75rem] border p-3 shadow-[0_24px_70px_rgb(0_0_0/0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgb(0_0_0/0.26)] lg:block",
              isBoutique
                ? "border-white/60 bg-white/60 text-[var(--space-surface-contrast)] backdrop-blur"
                : "border-white/25 bg-white/15 text-[var(--space-primary-contrast)] backdrop-blur",
            )}
          >
            <CommercialProductImage product={featuredProduct} variant={variant} priority="hero" />
            <div className="p-3">
              <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span>
              <h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight">{featuredProduct.name}</h2>
              <p className={cn("mt-2 text-lg font-black", isBoutique ? "text-[var(--space-primary)]" : "text-[var(--space-accent)]")}>{getProductPrice(store, featuredProduct)}</p>
            </div>
          </Link>
        ) : null}
        </div>
      </div>
    </section>
  );
}

export function CommercialCollectionCard({
  store,
  products,
  variant,
}: {
  store: CommercialTemplateStore;
  products: CommercialTemplateProduct[];
  variant: "showcase" | "boutique";
}) {
  const isBoutique = variant === "boutique";
  const previewProducts = products.slice(0, 3);
  if (!isBoutique || previewProducts.length === 0) return null;

  return (
    <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.75rem] border border-white/70 bg-[var(--space-surface)]/80 p-3 text-[var(--space-surface-contrast)] shadow-[0_18px_54px_rgb(0_0_0/0.08)] backdrop-blur">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Selección principal</p>
            <h2 className="mt-1 text-xl font-black leading-tight">Productos elegidos para ti</h2>
            <p className="mt-1 text-sm font-semibold leading-5 opacity-65">Una colección curada para comprar con confianza.</p>
          </div>
          <div className="flex -space-x-3">
            {previewProducts.map((product) => (
              <span key={product.id} className="block size-16 overflow-hidden rounded-2xl border-2 border-[var(--space-surface)] bg-[var(--space-muted)] shadow-sm">
                <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="h-full w-full object-cover" />
              </span>
            ))}
          </div>
        </div>
        {store.instagram || store.tiktok ? (
          <div className="mt-3 flex gap-2">
            {store.instagram ? (
              <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noreferrer" className="inline-flex size-9 items-center justify-center rounded-full bg-white/70 text-[var(--space-surface-contrast)] transition hover:brightness-95">
                <Camera className="size-4" />
              </a>
            ) : null}
            {store.tiktok ? (
              <a href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" rel="noreferrer" className="inline-flex size-9 items-center justify-center rounded-full bg-white/70 text-[var(--space-surface-contrast)] transition hover:brightness-95">
                <Music2 className="size-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CommercialCategoryChips({ categories, variant }: { categories: CommercialTemplateCategory[]; variant: "showcase" | "boutique" }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-black", variant === "boutique" ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)]" : "bg-[var(--space-primary)] text-[var(--space-primary-contrast)]")}>Todos</span>
      {categories.map((category) => (
        <span key={category.id} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-black ring-1", variant === "boutique" ? "bg-white/60 text-[var(--space-surface-contrast)] ring-white/70" : "bg-[var(--space-surface)] text-[var(--space-surface-contrast)] ring-[var(--space-border)]")}>
          {category.name}
        </span>
      ))}
    </div>
  );
}

function CommercialProductImage({
  product,
  variant,
  priority,
}: {
  product: CommercialTemplateProduct;
  variant: "showcase" | "boutique";
  priority: "hero" | "single" | "card";
}) {
  const imageUrl = product.imageUrl ?? "/placeholder-product.svg";
  const isBoutique = variant === "boutique";
  const shouldContain = priority !== "card";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[var(--space-muted)]",
        isBoutique ? "rounded-[1.35rem]" : "rounded-2xl",
        priority === "single" ? "aspect-[4/3] md:aspect-square" : priority === "hero" ? "aspect-[4/3]" : "aspect-[4/3]",
      )}
    >
      <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
      <div className={cn("absolute inset-0", isBoutique ? "bg-white/24" : "bg-black/[0.03]")} />
      <img src={imageUrl} alt="" className={cn("relative z-10 h-full w-full", shouldContain ? "object-contain p-3" : "object-cover")} />
    </div>
  );
}

export function CommercialProductCard({
  store,
  product,
  flow,
  isSingle,
  variant,
}: {
  store: CommercialTemplateStore;
  product: CommercialTemplateProduct;
  flow: StorefrontFlow;
  isSingle: boolean;
  variant: "showcase" | "boutique";
}) {
  const isBoutique = variant === "boutique";
  const productHref = `/${store.slug}/p/${product.slug}`;
  const microcopy = product.description ?? (flow.sellerAiEnabled ? "Te ayudamos a elegir antes de WhatsApp." : "Consulta disponibilidad y detalles por WhatsApp.");
  const price = getProductPrice(store, product);

  return (
    <article
      className={cn(
        "overflow-hidden border border-[var(--space-border)] bg-[var(--space-surface)] text-[var(--space-surface-contrast)]",
        isSingle
          ? "rounded-[1.75rem] p-3 shadow-[0_18px_56px_rgb(0_0_0/0.12)] md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-4"
          : "rounded-[1.35rem] p-2.5 shadow-sm",
        isBoutique && "border-white/60 bg-[var(--space-surface)]/80 shadow-[0_14px_40px_rgb(0_0_0/0.07)]",
      )}
    >
      <Link href={productHref} className="block">
        <CommercialProductImage product={product} variant={variant} priority={isSingle ? "single" : "card"} />
      </Link>
      <div className={cn(isSingle ? "flex flex-col justify-center p-2 md:p-5" : "p-2")}>
        <div className="flex flex-wrap gap-2">
          {product.isFeatured ? <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-black", isBoutique ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)]" : "bg-[var(--space-accent)] text-[var(--space-accent-contrast)]")}>{isBoutique ? "Favorito" : "Destacado"}</span> : null}
          {product.category ? <span className="inline-flex w-fit rounded-full bg-[var(--space-muted)] px-2.5 py-1 text-[11px] font-black opacity-80">{product.category.name}</span> : null}
        </div>
        <Link href={productHref}>
          <h3 className={cn("mt-3 font-black leading-tight", isSingle ? "text-2xl md:text-3xl" : "line-clamp-2 min-h-12 text-base leading-6")}>{product.name}</h3>
        </Link>
        <p className={cn("mt-2 font-black text-[var(--space-primary)]", isSingle ? "text-2xl" : "text-xl")}>{price}</p>
        <p className={cn("mt-2 text-sm font-semibold leading-6 opacity-70", !isSingle && "line-clamp-2")}>{microcopy}</p>
        <ProductConversionCta
          storeSlug={store.slug}
          storePlan={store.plan}
          productId={product.id}
          productName={product.name}
          productHref={productHref}
          fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
          variant="card"
          className="mt-4"
        />
      </div>
    </article>
  );
}

export function CommercialProductGrid({
  store,
  products,
  flow,
  title,
  eyebrow,
  variant,
}: {
  store: CommercialTemplateStore;
  products: CommercialTemplateProduct[];
  flow: StorefrontFlow;
  title: string;
  eyebrow: string;
  variant: "showcase" | "boutique";
}) {
  if (products.length === 0) return null;

  const isSingle = products.length === 1;

  return (
    <section className="mt-7">
      <div>
        <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black leading-tight">{title}</h2>
      </div>
      <div className={cn("mt-4 grid grid-cols-1 gap-4", isSingle ? "max-w-5xl" : "grid-cols-2 lg:grid-cols-3")}>
        {products.map((product) => (
          <CommercialProductCard key={product.id} store={store} product={product} flow={flow} isSingle={isSingle} variant={variant} />
        ))}
      </div>
    </section>
  );
}

export function CommercialFooter() {
  return <footer className="py-8 text-center text-xs font-black uppercase tracking-normal opacity-60">Hecho con JAKAWI</footer>;
}

export function CommercialEmptyProducts() {
  return <p className="mt-5 rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] px-4 py-5 text-center text-sm font-bold opacity-75">Este espacio está preparando sus productos.</p>;
}
