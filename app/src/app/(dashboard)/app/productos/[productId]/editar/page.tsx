import { notFound } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { store } = await requireStore();
  const { productId } = await params;
  const product = await getPrisma().product.findUnique({ where: { id: productId, storeId: store.id } });
  if (!product) notFound();

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Productos</p>
      <h1 className="text-4xl font-black">Editar producto</h1>
      <div className="mt-6">
        <ProductForm product={product} categories={store.categories} />
      </div>
    </section>
  );
}
