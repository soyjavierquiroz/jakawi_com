"use client";

import { ArrowRight, Bot, ChevronRight, Home, MessageCircle, Search, ShoppingBag, Sparkles, Star, Tags } from "lucide-react";
import Link from "next/link";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/ui";
import type { CommercialTemplateProduct, CommercialTemplateProps, CommercialTemplateStore } from "@/components/storefront/templates/components";

type HeroVisual = {
  imageUrl: string | null;
  imageMode: "cover" | "contain" | "fallback";
  product?: CommercialTemplateProduct;
};

function openSellerAi(product?: CommercialTemplateProduct) {
  window.dispatchEvent(
    new CustomEvent("jakawi:seller-ai-open", {
      detail: {
        productId: product?.id,
        productName: product?.name,
        action: "chat",
      },
    }),
  );
}

function getInitial(store: CommercialTemplateStore) {
  return store.name.trim().charAt(0).toUpperCase() || "J";
}

function getPrice(store: CommercialTemplateStore, product: CommercialTemplateProduct) {
  return formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  });
}

function getHeroVisual(store: CommercialTemplateStore, products: CommercialTemplateProduct[], featuredProduct?: CommercialTemplateProduct): HeroVisual {
  if (store.coverUrl) {
    return { imageUrl: store.coverUrl, imageMode: "cover" };
  }

  const product = featuredProduct ?? products.find((item) => item.imageUrl) ?? products[0];
  if (product?.imageUrl) {
    return { imageUrl: product.imageUrl, imageMode: "contain", product };
  }

  return { imageUrl: null, imageMode: "fallback", product };
}

function WhatsappLink({ store, className, children }: { store: CommercialTemplateStore; className?: string; children: React.ReactNode }) {
  return (
    <a href={`https://wa.me/${store.whatsapp}`} className={className}>
      {children}
    </a>
  );
}

function StoreAvatar({ store, className }: { store: CommercialTemplateStore; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--space-primary)] text-sm font-black text-[var(--space-primary-contrast)]", className)}>
      {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : getInitial(store)}
    </span>
  );
}

function CommerceImageFrame({
  imageUrl,
  alt,
  mode = "contain",
  className,
  imageClassName,
}: {
  imageUrl: string | null;
  alt: string;
  mode?: "cover" | "contain";
  className?: string;
  imageClassName?: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          "relative isolate overflow-hidden bg-[linear-gradient(135deg,color-mix(in_srgb,var(--space-primary)_18%,var(--space-surface))_0%,var(--space-surface)_52%,color-mix(in_srgb,var(--space-accent)_24%,var(--space-background))_100%)]",
          className,
        )}
      >
        <div className="absolute inset-x-6 top-6 h-12 rotate-[-8deg] rounded-2xl bg-white/24" />
        <div className="absolute inset-x-10 bottom-8 h-16 rotate-[7deg] rounded-2xl bg-[var(--space-primary)]/18" />
        <div className="relative z-10 grid h-full place-items-center">
          <ShoppingBag className="size-10 text-[var(--space-primary)] opacity-80" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative isolate overflow-hidden bg-[var(--space-muted)]", className)}>
      {mode === "contain" ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-28 blur-2xl saturate-125" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,.08)_100%)]" />
      <img
        src={imageUrl}
        alt={alt}
        className={cn("relative z-10 h-full w-full", mode === "cover" ? "object-cover" : "object-contain p-3", imageClassName)}
      />
    </div>
  );
}

function AppTopBar({ store, flow, heroProduct }: Pick<CommercialTemplateProps, "store" | "flow"> & { heroProduct?: CommercialTemplateProduct }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--space-border)] bg-[var(--space-surface)]/88 text-[var(--space-surface-contrast)] shadow-[0_10px_30px_rgb(0_0_0/0.05)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <StoreAvatar store={store} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-5">{store.name}</p>
            <p className="truncate text-[11px] font-bold leading-4 opacity-60">Tienda móvil</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {flow.sellerAiEnabled ? (
            <button type="button" onClick={() => openSellerAi(heroProduct)} className="grid size-9 place-items-center rounded-full bg-[var(--space-primary)] text-[var(--space-primary-contrast)] shadow-sm transition hover:brightness-95" aria-label="Abrir Seller AI">
              <Bot className="size-4" />
            </button>
          ) : null}
          <WhatsappLink store={store} className="grid size-9 place-items-center rounded-full bg-[var(--space-accent)] text-[var(--space-accent-contrast)] shadow-sm transition hover:brightness-95">
            <MessageCircle className="size-4" />
          </WhatsappLink>
        </div>
      </div>
    </header>
  );
}

function AppHero({ store, products, featuredProduct, flow }: CommercialTemplateProps & { featuredProduct?: CommercialTemplateProduct }) {
  const hero = getHeroVisual(store, products, featuredProduct);
  const hasProducts = products.length > 0;
  const title = hero.product?.isFeatured ? hero.product.name : store.name;
  const description = hero.product?.description ?? store.description ?? "Una experiencia de compra visual, rápida y guiada.";

  return (
    <section id="inicio" className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="relative isolate h-[320px] overflow-hidden rounded-[2rem] bg-[var(--space-primary)] text-[var(--space-primary-contrast)] shadow-[0_24px_70px_rgb(0_0_0/0.18)] sm:h-[340px]">
        {hero.imageMode === "cover" ? (
          <img src={hero.imageUrl ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover opacity-88" />
        ) : hero.imageMode === "contain" ? (
          <CommerceImageFrame imageUrl={hero.imageUrl} alt="" mode="contain" className="absolute inset-0 rounded-none" imageClassName="p-7" />
        ) : (
          <CommerceImageFrame imageUrl={null} alt="" className="absolute inset-0 rounded-none" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.12)_38%,rgba(0,0,0,.68)_100%)]" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-2 text-[11px] font-black backdrop-blur-md ring-1 ring-white/25">
          <Sparkles className="size-3.5 text-[var(--space-accent)]" />
          {flow.sellerAiEnabled ? "Compra guiada" : "Compra por WhatsApp"}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <h1 className="line-clamp-2 max-w-2xl text-3xl font-black leading-[1.04] sm:text-5xl">{title}</h1>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm font-semibold leading-6 opacity-88 sm:text-base">{description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={hasProducts ? "#productos" : `https://wa.me/${store.whatsapp}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--space-accent)] px-4 text-sm font-black text-[var(--space-accent-contrast)] shadow-sm transition hover:brightness-95">
              {hasProducts ? "Ver productos" : "Consultar"}
              <ArrowRight className="size-4" />
            </a>
            {flow.sellerAiEnabled ? (
              <button type="button" onClick={() => openSellerAi(hero.product)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/18 px-4 text-sm font-black text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/24">
                <Bot className="size-4" />
                Seller AI
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryRail({ categories, flow, store }: Pick<CommercialTemplateProps, "categories" | "flow" | "store">) {
  const fallbackChips = [
    { label: "Destacados", href: "#recomendado", icon: Star },
    { label: flow.sellerAiEnabled ? "Compra guiada" : "Consulta", href: flow.sellerAiEnabled ? "#seller-ai" : `https://wa.me/${store.whatsapp}`, icon: flow.sellerAiEnabled ? Bot : MessageCircle },
    { label: "WhatsApp", href: `https://wa.me/${store.whatsapp}`, icon: MessageCircle },
  ];

  return (
    <section className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black leading-tight">{categories.length > 0 ? "Explora" : "Accesos rápidos"}</h2>
        <a href="#productos" className="inline-flex items-center gap-1 text-xs font-black text-[var(--space-primary)]">
          Ver todo
          <ChevronRight className="size-3.5" />
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.length > 0
          ? categories.map((category, index) => (
              <a
                key={category.id}
                href="#productos"
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-black ring-1 transition hover:-translate-y-0.5",
                  index === 0
                    ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)] ring-transparent"
                    : "bg-[var(--space-surface)] text-[var(--space-surface-contrast)] ring-[var(--space-border)]",
                )}
              >
                <Tags className="size-3.5" />
                {category.name}
              </a>
            ))
          : fallbackChips.map((chip, index) => {
              const Icon = chip.icon;
              const className = cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-black ring-1 transition hover:-translate-y-0.5",
                index === 0
                  ? "bg-[var(--space-primary)] text-[var(--space-primary-contrast)] ring-transparent"
                  : "bg-[var(--space-surface)] text-[var(--space-surface-contrast)] ring-[var(--space-border)]",
              );

              if (chip.href === "#seller-ai") {
                return (
                  <button key={chip.label} type="button" onClick={() => openSellerAi()} className={className}>
                    <Icon className="size-3.5" />
                    {chip.label}
                  </button>
                );
              }

              return (
                <a key={chip.label} href={chip.href} className={className}>
                  <Icon className="size-3.5" />
                  {chip.label}
                </a>
              );
            })}
      </div>
    </section>
  );
}

function FeaturedProductCard({ store, product, flow, isPrimary = false }: Pick<CommercialTemplateProps, "store" | "flow"> & { product: CommercialTemplateProduct; isPrimary?: boolean }) {
  const href = `/${store.slug}/p/${product.slug}`;

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] text-[var(--space-surface-contrast)] shadow-[0_14px_46px_rgb(0_0_0/0.08)]",
        isPrimary ? "grid gap-0 sm:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]" : "w-[235px] shrink-0",
      )}
    >
      <Link href={href} className="block">
        <CommerceImageFrame
          imageUrl={product.imageUrl}
          alt={product.name}
          mode={isPrimary ? "contain" : "contain"}
          className={cn("rounded-none", isPrimary ? "aspect-[1.08/1] min-h-[230px]" : "aspect-square")}
        />
      </Link>
      <div className={cn("flex flex-col", isPrimary ? "justify-center p-4 sm:p-5" : "p-3")}>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex w-fit rounded-full bg-[var(--space-primary)] px-2.5 py-1 text-[11px] font-black text-[var(--space-primary-contrast)]">
            {product.isFeatured ? "Destacado" : "Recomendado"}
          </span>
          {product.category ? <span className="inline-flex w-fit rounded-full bg-[var(--space-muted)] px-2.5 py-1 text-[11px] font-black opacity-75">{product.category.name}</span> : null}
        </div>
        <Link href={href}>
          <h3 className={cn("mt-3 font-black leading-tight", isPrimary ? "text-2xl" : "line-clamp-2 min-h-12 text-base leading-6")}>{product.name}</h3>
        </Link>
        <p className={cn("mt-2 font-black text-[var(--space-primary)]", isPrimary ? "text-2xl" : "text-lg")}>{getPrice(store, product)}</p>
        <p className={cn("mt-2 text-sm font-semibold leading-5 opacity-68", isPrimary ? "line-clamp-3" : "line-clamp-2")}>
          {product.description ?? (flow.sellerAiEnabled ? "Preguntale a Seller AI si es para ti." : "Consulta disponibilidad por WhatsApp.")}
        </p>
        <ProductConversionCta
          storeSlug={store.slug}
          storePlan={store.plan}
          productId={product.id}
          productName={product.name}
          productHref={href}
          fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
          variant="card"
          className="mt-4"
        />
      </div>
    </article>
  );
}

function RecommendedSection({ store, products, flow }: Pick<CommercialTemplateProps, "store" | "products" | "flow">) {
  if (products.length === 0) return null;
  const [primary, ...secondary] = products;

  return (
    <section id="recomendado" className="mx-auto mt-5 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Para empezar</p>
          <h2 className="mt-1 text-2xl font-black leading-tight">Recomendado para ti</h2>
        </div>
      </div>
      <FeaturedProductCard store={store} product={primary} flow={flow} isPrimary />
      {secondary.length > 0 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secondary.map((product) => (
            <FeaturedProductCard key={product.id} store={store} product={product} flow={flow} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AppProductGrid({ store, products, title }: Pick<CommercialTemplateProps, "store" | "products"> & { title: string }) {
  if (products.length === 0) return null;
  const isSingle = products.length === 1;

  return (
    <section id="productos" className="mx-auto mt-7 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-[var(--space-primary)]">Catalogo</p>
          <h2 className="mt-1 text-2xl font-black leading-tight">{title}</h2>
        </div>
      </div>
      <div className={cn("grid gap-3", isSingle ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3")}>
        {products.map((product) => {
          const href = `/${store.slug}/p/${product.slug}`;
          return (
            <article key={product.id} className="overflow-hidden rounded-[1.25rem] border border-[var(--space-border)] bg-[var(--space-surface)] text-[var(--space-surface-contrast)] shadow-sm">
              <Link href={href} className="block">
                <CommerceImageFrame imageUrl={product.imageUrl} alt={product.name} className={cn("rounded-none", isSingle ? "aspect-[4/3]" : "aspect-square")} />
              </Link>
              <div className="p-3">
                {product.category ? <p className="truncate text-[11px] font-black text-[var(--space-primary)]">{product.category.name}</p> : null}
                <Link href={href}>
                  <h3 className={cn("mt-1 font-black leading-tight", isSingle ? "text-xl" : "line-clamp-2 min-h-10 text-sm leading-5")}>{product.name}</h3>
                </Link>
                <p className="mt-2 text-base font-black text-[var(--space-primary)]">{getPrice(store, product)}</p>
                <ProductConversionCta
                  storeSlug={store.slug}
                  storePlan={store.plan}
                  productId={product.id}
                  productName={product.name}
                  productHref={href}
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

function EmptyCommerceState({ store }: { store: CommercialTemplateStore }) {
  return (
    <section id="productos" className="mx-auto mt-7 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.6rem] border border-[var(--space-border)] bg-[var(--space-surface)] p-5 text-center text-[var(--space-surface-contrast)] shadow-sm">
        <ShoppingBag className="mx-auto size-9 text-[var(--space-primary)]" />
        <h2 className="mt-3 text-xl font-black">Productos en preparacion</h2>
        <p className="mt-2 text-sm font-semibold leading-6 opacity-70">Puedes consultar disponibilidad directamente por WhatsApp.</p>
        <WhatsappLink store={store} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--space-primary)] px-5 text-sm font-black text-[var(--space-primary-contrast)]">
          Consultar
        </WhatsappLink>
      </div>
    </section>
  );
}

function BottomAppNavigation({ store, flow, heroProduct }: Pick<CommercialTemplateProps, "store" | "flow"> & { heroProduct?: CommercialTemplateProduct }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:hidden" aria-label="Navegacion de tienda">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full border border-[var(--space-border)] bg-[var(--space-surface)]/94 p-1.5 text-[var(--space-surface-contrast)] shadow-[0_18px_55px_rgb(0_0_0/0.2)] backdrop-blur-xl">
        <a href="#inicio" className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-black transition hover:bg-[var(--space-muted)]">
          <Home className="size-4" />
          Inicio
        </a>
        <a href="#productos" className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-black transition hover:bg-[var(--space-muted)]">
          <Search className="size-4" />
          Explorar
        </a>
        {flow.sellerAiEnabled ? (
          <button type="button" onClick={() => openSellerAi(heroProduct)} className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--space-primary)] text-[10px] font-black text-[var(--space-primary-contrast)] transition hover:brightness-95">
            <Bot className="size-4" />
            Seller AI
          </button>
        ) : (
          <a href="#recomendado" className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--space-primary)] text-[10px] font-black text-[var(--space-primary-contrast)] transition hover:brightness-95">
            <Star className="size-4" />
            Top
          </a>
        )}
        <WhatsappLink store={store} className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-black transition hover:bg-[var(--space-muted)]">
          <MessageCircle className="size-4" />
          WhatsApp
        </WhatsappLink>
      </div>
    </nav>
  );
}

export function AppCommerceTemplate({ store, categories, products, flow }: CommercialTemplateProps) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const recommendedProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, Math.min(products.length, 3));
  const recommendedIds = new Set(recommendedProducts.map((product) => product.id));
  const remainingProducts = products.filter((product) => !recommendedIds.has(product.id));
  const heroProduct = recommendedProducts[0] ?? products[0];

  return (
    <div className="min-h-dvh bg-[var(--space-background)] pb-28 text-[var(--space-background-contrast)] md:pb-10">
      <AppTopBar store={store} flow={flow} heroProduct={heroProduct} />
      <AppHero store={store} categories={categories} products={products} flow={flow} featuredProduct={heroProduct} />
      <CategoryRail categories={categories} flow={flow} store={store} />
      {products.length === 0 ? (
        <EmptyCommerceState store={store} />
      ) : (
        <>
          <RecommendedSection store={store} products={recommendedProducts} flow={flow} />
          <AppProductGrid store={store} products={remainingProducts} title={remainingProducts.length > 0 ? "Mas productos" : "Productos"} />
        </>
      )}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs font-black uppercase tracking-normal opacity-55 sm:px-6 lg:px-8">Hecho con JAKAWI</footer>
      <BottomAppNavigation store={store} flow={flow} heroProduct={heroProduct} />
    </div>
  );
}
