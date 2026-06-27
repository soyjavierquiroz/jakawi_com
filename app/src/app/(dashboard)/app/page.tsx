import { Boxes, Eye, MessageCircle, Store as StoreIcon } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { dashboardConfig } from "@/config/dashboard";
import { getPublicStoreUrl, siteConfig } from "@/config/site";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { store } = await requireStore();
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalProducts, visibleProducts, storeViews, whatsappClicks] = await Promise.all([
    getPrisma().product.count({ where: { storeId: store.id } }),
    getPrisma().product.count({ where: { storeId: store.id, isVisible: true } }),
    getPrisma().analyticsEvent.count({ where: { storeId: store.id, type: "STORE_VIEW", createdAt: { gte: since } } }),
    getPrisma().analyticsEvent.count({ where: { storeId: store.id, type: "WHATSAPP_CLICK", createdAt: { gte: since } } }),
  ]);
  const publicUrl = getPublicStoreUrl(store.slug);

  const stats = [
    { label: dashboardConfig.stats.totalProducts, value: totalProducts, icon: Boxes },
    { label: dashboardConfig.stats.visibleProducts, value: visibleProducts, icon: StoreIcon },
    { label: dashboardConfig.stats.storeViews, value: storeViews, icon: Eye },
    { label: dashboardConfig.stats.whatsappClicks, value: whatsappClicks, icon: MessageCircle },
  ];

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Inicio</p>
          <h1 className="text-4xl font-black">Hola, {store.name}</h1>
        </div>
        <Link href={siteConfig.routes.newProduct} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          Agregar producto
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-500">{dashboardConfig.publicLinkTitle}</p>
        <p className="mt-1 text-sm text-neutral-500">{dashboardConfig.publicLinkHint}</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <code className="flex-1 rounded-md bg-brand-muted px-3 py-3 text-sm text-neutral-800">{publicUrl}</code>
          <CopyButton value={publicUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-brand-border bg-brand-paper p-5 shadow-sm">
            <stat.icon className="size-5 text-brand" />
            <p className="mt-4 text-3xl font-black">{stat.value}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-brand-dark p-6 text-white">
        <h2 className="text-2xl font-black">{dashboardConfig.productCta.title}</h2>
        <p className="mt-2 max-w-2xl text-white/70">{dashboardConfig.productCta.text}</p>
        <Link href={siteConfig.routes.products} className="mt-5 inline-flex h-11 items-center rounded-md bg-brand-lime px-5 font-bold text-brand-dark hover:bg-brand-yellow">
          {dashboardConfig.productCta.label}
        </Link>
      </div>
    </section>
  );
}
