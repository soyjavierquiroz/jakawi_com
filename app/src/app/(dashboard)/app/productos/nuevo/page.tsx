import { ProductForm } from "@/components/ProductForm";
import { requireStore } from "@/lib/auth";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Productos</p>
      <h1 className="text-4xl font-black">Agregar producto</h1>
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}
      <div className="mt-6">
        <ProductForm categories={store.categories} currency={store.currency} />
      </div>
    </section>
  );
}
