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
    <section className="space-y-4 md:space-y-6">
      <div>
        <p className="text-sm font-bold leading-none text-brand-dark">Productos</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Agregar producto</h1>
      </div>
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}
      <div>
        <ProductForm categories={store.categories} currency={store.currency} />
      </div>
    </section>
  );
}
