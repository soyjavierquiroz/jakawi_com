import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, Bot, Camera, MessageCircle, Music2, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
import { buildCommercialSpaceTheme, commercialThemeToCssVariables } from "@/lib/commercial-theme";
import { reservedSlugs } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { getStorefrontFlow } from "@/lib/storefront-flow";

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  if (reservedSlugs.has(storeSlug)) notFound();

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
  const flow = getStorefrontFlow(store.plan);
  const theme = buildCommercialSpaceTheme(store);
  const themeStyle = commercialThemeToCssVariables(theme) as CSSProperties;
  const hasProducts = store.products.length > 0;
  const hasSingleProduct = store.products.length === 1;

  return (
    <main style={themeStyle} className={flow.sellerAiEnabled ? "min-h-dvh bg-[var(--space-background)] pb-24 text-[var(--space-background-contrast)]" : "min-h-dvh bg-[var(--space-background)] pb-10 text-[var(--space-background-contrast)]"}>
      <section className="relative overflow-hidden rounded-b-[2rem] bg-[var(--space-primary)] text-[var(--space-primary-contrast)] shadow-sm">
        {store.coverUrl ? <img src={store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity" /> : null}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/18 to-transparent" />
        <div className="relative mx-auto flex min-h-[260px] max-w-5xl flex-col justify-end px-4 pb-16 pt-10 sm:min-h-[320px] sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-black ring-1 ring-white/18 backdrop-blur">
              <Sparkles className="size-4 text-[var(--space-accent)]" />
              {flow.sellerAiEnabled ? "Compra guiada con Seller AI" : "Consulta clara por WhatsApp"}
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{store.name}</h1>
            <p className="mt-3 max-w-xl text-base font-semibold leading-7 opacity-85 sm:text-lg">{store.description ?? "Espacio comercial creado con JAKAWI."}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={hasProducts ? "#productos" : `https://wa.me/${store.whatsapp}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--space-accent)] px-4 text-sm font-black text-[var(--space-accent-contrast)] shadow-sm transition hover:brightness-95">
                {hasProducts ? "Ver productos" : "Consultar por WhatsApp"}
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] p-4 text-[var(--space-surface-contrast)] shadow-[0_18px_50px_rgb(0_0_0/0.12)] sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="size-20 overflow-hidden rounded-2xl bg-[var(--space-primary)] ring-4 ring-[var(--space-background)] sm:size-24">
              {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl font-black text-[var(--space-primary-contrast)]">{store.name[0]}</div>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black sm:text-2xl">{store.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--space-muted)] px-2.5 py-1 text-xs font-black">
                  <BadgeCheck className="size-3.5 text-[var(--space-primary)]" />
                  Espacio comercial
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{store.description ?? "Espacio comercial creado con JAKAWI."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--space-muted)] px-3 py-1.5 text-xs font-black">
                  <Bot className="size-3.5 text-[var(--space-primary)]" />
                  Compra guiada
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--space-muted)] px-3 py-1.5 text-xs font-black">
                  <MessageCircle className="size-3.5 text-[var(--space-primary)]" />
                  Contexto por WhatsApp
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--space-muted)] px-3 py-1.5 text-xs font-black">
                  <Sparkles className="size-3.5 text-[var(--space-primary)]" />
                  Productos destacados
                </span>
              </div>
              {(store.instagram || store.tiktok) ? (
                <div className="mt-4 flex gap-2">
                  {store.instagram ? (
                    <a href={`https://instagram.com/${store.instagram}`} target="_blank" className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--space-muted)] text-[var(--space-surface-contrast)] transition hover:brightness-95">
                      <Camera className="size-4" />
                    </a>
                  ) : null}
                  {store.tiktok ? (
                    <a href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--space-muted)] text-[var(--space-surface-contrast)] transition hover:brightness-95">
                      <Music2 className="size-4" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section id="productos" className="mx-auto mt-5 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-[var(--space-primary)]">Catálogo</p>
            <h2 className="text-2xl font-black">Productos destacados</h2>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 rounded-full bg-[var(--space-primary)] px-4 py-2 text-sm font-bold text-[var(--space-primary-contrast)]">Todos</span>
          {store.categories.length > 0 ? store.categories.map((category) => (
            <span key={category.id} className="shrink-0 rounded-full bg-[var(--space-surface)] px-4 py-2 text-sm font-bold text-[var(--space-surface-contrast)] ring-1 ring-[var(--space-border)]">
              {category.name}
            </span>
          )) : <span className="shrink-0 rounded-full bg-[var(--space-surface)] px-4 py-2 text-sm font-bold text-[var(--space-surface-contrast)] ring-1 ring-[var(--space-border)]">Selección principal</span>}
        </div>

        <div className={hasSingleProduct ? "mt-3 grid grid-cols-1 gap-4" : "mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
          {store.products.map((product) => (
            <article key={product.id} className={hasSingleProduct ? "overflow-hidden rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] p-3 text-[var(--space-surface-contrast)] shadow-[0_16px_42px_rgb(0_0_0/0.10)] md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-4" : "overflow-hidden rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] p-3 text-[var(--space-surface-contrast)] shadow-sm"}>
              <Link href={`/${store.slug}/p/${product.slug}`} className="block">
                <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className={hasSingleProduct ? "aspect-[4/3] w-full rounded-xl bg-[var(--space-muted)] object-cover md:h-full md:min-h-[300px]" : "aspect-[4/3] w-full rounded-xl bg-[var(--space-muted)] object-cover"} />
              </Link>
              <div className={hasSingleProduct ? "flex flex-col justify-center p-2 md:p-4" : "p-2"}>
                {product.isFeatured ? <span className="mt-2 inline-flex w-fit rounded-full bg-[var(--space-accent)] px-2.5 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span> : null}
                <Link href={`/${store.slug}/p/${product.slug}`}>
                  <h3 className={hasSingleProduct ? "mt-3 text-2xl font-black leading-tight md:text-3xl" : "mt-3 line-clamp-2 min-h-12 text-base font-black leading-6"}>{product.name}</h3>
                </Link>
                <p className="mt-2 text-xl font-black text-[var(--space-primary)]">
                  {formatMoney({
                    amountCents: product.priceCents,
                    currency: store.currency ?? product.currency,
                    countryCode: store.countryCode ?? "BO",
                    locale: store.locale,
                  })}
                </p>
                {flow.sellerAiEnabled ? <p className="mt-2 text-sm font-semibold leading-6 opacity-70">Te ayudamos a elegir antes de WhatsApp.</p> : null}
                <ProductConversionCta
                  storeSlug={store.slug}
                  storePlan={store.plan}
                  productId={product.id}
                  productName={product.name}
                  productHref={`/${store.slug}/p/${product.slug}`}
                  fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
                  variant="card"
                  className="mt-4"
                />
              </div>
            </article>
          ))}
        </div>

        {!hasProducts ? <p className="mt-5 rounded-2xl border border-[var(--space-border)] bg-[var(--space-surface)] px-4 py-5 text-center text-sm font-bold opacity-75">Este espacio está preparando sus productos.</p> : null}

        <footer className="py-7 text-center text-xs font-black uppercase tracking-normal opacity-45">Hecho con JAKAWI</footer>
      </section>
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
    </main>
  );
}
