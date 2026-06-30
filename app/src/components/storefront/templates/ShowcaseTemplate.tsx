import {
  CommercialCategoryChips,
  CommercialEmptyProducts,
  CommercialFooter,
  CommercialHero,
  CommercialProductGrid,
  type CommercialTemplateProps,
} from "@/components/storefront/templates/components";

export function ShowcaseTemplate({ store, categories, products, flow }: CommercialTemplateProps) {
  const featuredProducts = products.filter((product) => product.isFeatured);
  const regularProducts = products.filter((product) => !product.isFeatured);
  const hasFeaturedProducts = featuredProducts.length > 0;
  const primaryProducts = hasFeaturedProducts ? featuredProducts : products;
  const featuredProduct = primaryProducts[0];

  return (
    <>
      <CommercialHero store={store} flow={flow} variant="showcase" featuredProduct={featuredProduct} />

      <section id="productos" className="mx-auto mt-7 max-w-6xl px-4 sm:px-6 lg:px-8">
        <CommercialCategoryChips categories={categories} variant="showcase" />
        {products.length === 0 ? <CommercialEmptyProducts /> : null}
        <CommercialProductGrid
          store={store}
          products={primaryProducts}
          flow={flow}
          eyebrow={hasFeaturedProducts ? "Selección principal" : "Productos"}
          title={hasFeaturedProducts ? "Productos destacados" : "Selección destacada"}
          variant="showcase"
        />
        {hasFeaturedProducts ? <CommercialProductGrid store={store} products={regularProducts} flow={flow} eyebrow="Más opciones" title="También disponible" variant="showcase" /> : null}
        <CommercialFooter />
      </section>
    </>
  );
}
