import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { CommercialSpaceRenderer } from "@/components/storefront/templates/CommercialSpaceRenderer";
import { trackEvent } from "@/lib/analytics";
import { buildCommercialSpaceTheme, commercialThemeToCssVariables } from "@/lib/commercial-theme";
import { reservedSlugs } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";

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
  const theme = buildCommercialSpaceTheme(store);
  const themeStyle = commercialThemeToCssVariables(theme) as CSSProperties;

  return (
    <div style={themeStyle}>
      <CommercialSpaceRenderer store={store} categories={store.categories} products={store.products} />
    </div>
  );
}
