import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isJakawiPlatformHost, resolveStoreFromHost } from "@/lib/domains";
import { reservedSlugs } from "@/lib/format";
import { renderStorefrontBySlug } from "@/lib/storefront-pages";

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const headerStore = await headers();
  const hostname = headerStore.get("host");

  if (!isJakawiPlatformHost(hostname)) {
    const domainStore = await resolveStoreFromHost(hostname);
    if (domainStore) return renderStorefrontBySlug(domainStore.store.slug);
  }

  if (reservedSlugs.has(storeSlug)) notFound();

  return renderStorefrontBySlug(storeSlug);
}
