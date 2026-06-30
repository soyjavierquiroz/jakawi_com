import { Camera, MessageCircle, Music2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { ProductConversionCta } from "@/components/storefront/ProductConversionCta";
import { VisitorProvider } from "@/context/VisitorContext";
import { trackEvent } from "@/lib/analytics";
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

  return (
    <main className={flow.sellerAiEnabled ? "min-h-dvh bg-background pb-24" : "min-h-dvh bg-background pb-10"}>
      <section className="mx-auto max-w-lg bg-brand-paper shadow-sm">
        <div className="h-44 bg-brand-dark">
          {store.coverUrl ? <img src={store.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-12 size-24 overflow-hidden rounded-full border-4 border-brand-paper bg-brand-dark">
            {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl font-black text-white">{store.name[0]}</div>}
          </div>
          <h1 className="mt-4 text-3xl font-black">{store.name}</h1>
          <p className="mt-2 leading-7 text-neutral-600">{store.description ?? "Tienda creada con JAKAWI."}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-sm font-bold text-brand-dark">
              <MessageCircle className="size-4" />
              {flow.sellerAiEnabled ? "Compra guiada con Seller AI" : "Consulta por WhatsApp"}
            </span>
            {store.instagram ? (
              <a href={`https://instagram.com/${store.instagram}`} target="_blank" className="inline-flex size-10 items-center justify-center rounded-full bg-brand-muted text-neutral-700">
                <Camera className="size-4" />
              </a>
            ) : null}
            {store.tiktok ? (
              <a href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" className="inline-flex size-10 items-center justify-center rounded-full bg-brand-muted text-neutral-700">
                <Music2 className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-lg px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="shrink-0 rounded-full bg-brand-dark px-4 py-2 text-sm font-bold text-white">Todos</span>
          {store.categories.map((category) => (
            <span key={category.id} className="shrink-0 rounded-full bg-brand-paper px-4 py-2 text-sm font-bold text-neutral-700 ring-1 ring-brand-border">
              {category.name}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {store.products.map((product) => (
            <article key={product.id} className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
              <Link href={`/${store.slug}/p/${product.slug}`}>
                <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="aspect-square w-full rounded-md object-cover" />
                {product.isFeatured ? <span className="mt-2 inline-flex rounded-full bg-brand-lime px-2 py-1 text-[11px] font-black text-brand-dark">Destacado</span> : null}
                <h2 className="mt-3 line-clamp-2 min-h-10 text-sm font-black">{product.name}</h2>
              </Link>
              <p className="mt-1 font-black text-brand-dark">
                {formatMoney({
                  amountCents: product.priceCents,
                  currency: store.currency ?? product.currency,
                  countryCode: store.countryCode ?? "BO",
                  locale: store.locale,
                })}
              </p>
              <ProductConversionCta
                storeSlug={store.slug}
                storePlan={store.plan}
                productId={product.id}
                productName={product.name}
                productHref={`/${store.slug}/p/${product.slug}`}
                fallbackWhatsappHref={`/api/whatsapp/click?productId=${product.id}`}
                variant="card"
                className="mt-3"
              />
            </article>
          ))}
        </div>

        <footer className="py-8 text-center text-sm font-semibold text-neutral-500">Hecho con JAKAWI</footer>
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
