import type { Category, Product } from "@prisma/client";
import Link from "next/link";
import { normalizeCurrency } from "@/config/countries";
import { saveProductAction } from "@/lib/actions";
import { centsToInput } from "@/lib/format";
import { ProductImageInput } from "@/components/ProductImageInput";

export function ProductForm({
  product,
  categories,
  currency,
}: {
  product?: Product | null;
  categories: Category[];
  currency?: string | null;
}) {
  const normalizedCurrency = normalizeCurrency(currency ?? product?.currency, "BO");

  return (
    <form action={saveProductAction} className="space-y-4 rounded-lg border border-brand-border bg-brand-paper p-3 pb-24 shadow-sm md:space-y-5 md:p-6">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-neutral-700">Nombre</span>
          <input
            required
            name="name"
            defaultValue={product?.name}
            className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-neutral-700">Slug</span>
          <input
            name="slug"
            defaultValue={product?.slug}
            placeholder="se genera desde el nombre"
            className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-neutral-700">Precio ({normalizedCurrency})</span>
          <input
            required
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product ? centsToInput(product.priceCents) : ""}
            className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-neutral-700">Categoría</span>
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-neutral-700">Descripción</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-md border border-brand-border px-3 py-2 outline-none focus:border-brand"
        />
      </label>

      <section className="rounded-md border border-brand-border bg-white p-3 md:p-4">
        <ProductImageInput currentImageUrl={product?.imageUrl} />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-md border border-brand-border bg-white p-3 text-sm font-semibold text-neutral-700">
          <input name="isVisible" type="checkbox" defaultChecked={product?.isVisible ?? true} className="mt-1 size-4 accent-brand" />
          <span>
            Visible en tienda
            <span className="block text-xs font-semibold leading-5 text-neutral-500">Los productos ocultos no aparecen en la tienda pública.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-md border border-brand-border bg-white p-3 text-sm font-semibold text-neutral-700">
          <input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} className="mt-1 size-4 accent-brand" />
          <span>
            Producto destacado
            <span className="block text-xs font-semibold leading-5 text-neutral-500">Aparece primero en tu tienda pública.</span>
          </span>
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-[1fr_auto] gap-2 border-t border-brand-border bg-brand-paper/95 px-4 py-3 backdrop-blur md:static md:flex md:border-0 md:bg-transparent md:p-0">
        <button className="h-11 rounded-md bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark">
          Guardar producto
        </button>
        <Link href="/app/productos" className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-neutral-600 hover:border-brand hover:text-neutral-950 md:border-0">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
