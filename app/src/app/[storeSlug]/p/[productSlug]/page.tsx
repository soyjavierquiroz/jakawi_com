import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAiWidget } from "@/components/seller-ai/SellerAiWidget";
import { trackEvent } from "@/lib/analytics";
import { formatMoney } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";

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

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <article className="mx-auto max-w-lg overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="aspect-square w-full object-cover" />
        <div className="p-5">
          <Link href={`/${store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-950">
            <ArrowLeft className="size-4" />
            Volver a tienda
          </Link>
          <h1 className="mt-4 text-3xl font-black">{product.name}</h1>
          <p className="mt-2 text-2xl font-black text-brand-dark">{formatMoney(product.priceCents, product.currency)}</p>
          <p className="mt-4 leading-7 text-neutral-600">{product.description ?? "Consulta disponibilidad por WhatsApp."}</p>
          <a href={`/api/whatsapp/click?productId=${product.id}`} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-md bg-brand font-bold text-white transition hover:bg-brand-dark">
            <MessageCircle className="size-5" />
            Preguntar por WhatsApp
          </a>
        </div>
      </article>
      <SellerAiWidget
        storeSlug={store.slug}
        storeName={store.name}
        productId={product.id}
        productName={product.name}
        categoryName={product.category?.name}
        whatsapp={store.whatsapp}
      />
    </main>
  );
}
