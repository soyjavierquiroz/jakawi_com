import {
  CommercialCategoryChips,
  CommercialCollectionCard,
  CommercialEmptyProducts,
  CommercialFooter,
  CommercialHero,
  CommercialProductGrid,
  type CommercialTemplateProps,
} from "@/components/storefront/templates/components";

export function BoutiqueTemplate({ store, categories, products, flow }: CommercialTemplateProps) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const regularProducts = products.filter((product) => !product.isFeatured);
  const hasFeaturedProducts = featuredProducts.length > 0;
  const primaryProducts = hasFeaturedProducts ? featuredProducts : products;
  const featuredProduct = primaryProducts[0];

  return (
    <>
      <CommercialHero store={store} flow={flow} variant="boutique" featuredProduct={featuredProduct} />
      <CommercialCollectionCard store={store} products={primaryProducts} variant="boutique" />

      <section id="productos" className="mx-auto mt-7 max-w-6xl px-4 sm:px-6 lg:px-8">
        <CommercialCategoryChips categories={categories} variant="boutique" />
        {products.length === 0 ? <CommercialEmptyProducts /> : null}
        <CommercialProductGrid
          store={store}
          products={primaryProducts}
          flow={flow}
          eyebrow={hasFeaturedProducts ? "Favoritos" : "Selección"}
          title={hasFeaturedProducts ? "Productos destacados" : "Selección principal"}
          variant="boutique"
        />
        {hasFeaturedProducts ? <CommercialProductGrid store={store} products={regularProducts} flow={flow} eyebrow="Para explorar" title="Más productos" variant="boutique" /> : null}
        <CommercialFooter />
      </section>
    </>
  );
}
