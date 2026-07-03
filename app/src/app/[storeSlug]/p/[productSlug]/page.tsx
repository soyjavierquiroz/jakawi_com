import { headers } from "next/headers";
import { isJakawiPlatformHost, resolveStoreFromHost } from "@/lib/domains";
import { renderProductBySlug } from "@/lib/storefront-pages";

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;
  const headerStore = await headers();
  const hostname = headerStore.get("host");

  if (!isJakawiPlatformHost(hostname)) {
    const domainStore = await resolveStoreFromHost(hostname);
    if (domainStore) return renderProductBySlug(domainStore.store.slug, productSlug, { directHost: true });
  }

  return renderProductBySlug(storeSlug, productSlug);
}
