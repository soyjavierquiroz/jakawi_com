import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isJakawiPlatformHost, resolveStoreFromHost } from "@/lib/domains";
import { renderProductBySlug } from "@/lib/storefront-pages";

export default async function CustomDomainProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const headerStore = await headers();
  const hostname = headerStore.get("host");

  if (isJakawiPlatformHost(hostname)) notFound();

  const domainStore = await resolveStoreFromHost(hostname);
  if (!domainStore) notFound();

  return renderProductBySlug(domainStore.store.slug, productSlug, { directHost: true });
}
