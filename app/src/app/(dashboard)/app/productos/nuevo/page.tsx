import { ProductForm } from "@/components/ProductForm";
import { requireStore } from "@/lib/auth";

export default async function NewProductPage() {
  const { store } = await requireStore();
  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Productos</p>
      <h1 className="text-4xl font-black">Agregar producto</h1>
      <div className="mt-6">
        <ProductForm categories={store.categories} />
      </div>
    </section>
  );
}
