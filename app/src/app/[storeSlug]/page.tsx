import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { isJakawiPlatformHost, resolveCanonicalCustomDomainRedirect, resolveStoreFromHost } from "@/lib/domains";
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
  const canonicalHost = await resolveCanonicalCustomDomainRedirect(hostname);
  if (canonicalHost) permanentRedirect(`https://${canonicalHost}/${storeSlug}`);

  if (!isJakawiPlatformHost(hostname)) {
    const domainStore = await resolveStoreFromHost(hostname);
    if (domainStore) return renderStorefrontBySlug(domainStore.store.slug);
  }

  if (reservedSlugs.has(storeSlug)) notFound();

  return renderStorefrontBySlug(storeSlug);
}
