import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { isJakawiPlatformHost, resolveCanonicalCustomDomainRedirect, resolveStoreFromHost } from "@/lib/domains";
import { renderProductBySlug } from "@/lib/storefront-pages";

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;
  const headerStore = await headers();
  const hostname = headerStore.get("host");
  const canonicalHost = await resolveCanonicalCustomDomainRedirect(hostname);
  if (canonicalHost) {
    const pathname = storeSlug === "p" ? `/p/${productSlug}` : `/${storeSlug}/p/${productSlug}`;
    permanentRedirect(`https://${canonicalHost}${pathname}`);
  }

  if (!isJakawiPlatformHost(hostname)) {
    const domainStore = await resolveStoreFromHost(hostname);
    if (domainStore) return renderProductBySlug(domainStore.store.slug, productSlug, { directHost: true });
  }

  return renderProductBySlug(storeSlug, productSlug);
}
