import { notFound } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { store } = await requireStore();
  const { productId } = await params;
  const query = await searchParams;
  const product = await getPrisma().product.findUnique({ where: { id: productId, storeId: store.id } });
  if (!product) notFound();

  return (
    <section className="space-y-4 md:space-y-6">
      <div>
        <p className="text-sm font-bold leading-none text-brand-dark">Productos</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Editar producto</h1>
      </div>
      {query.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{query.error}</p> : null}
      <div>
        <ProductForm product={product} categories={store.categories} currency={store.currency} />
      </div>
    </section>
  );
}
