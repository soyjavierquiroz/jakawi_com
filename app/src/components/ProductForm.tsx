import type { Category, Product } from "@prisma/client";
import Link from "next/link";
import { saveProductAction } from "@/lib/actions";
import { centsToInput } from "@/lib/format";

export function ProductForm({
  product,
  categories,
}: {
  product?: Product | null;
  categories: Category[];
}) {
  return (
    <form action={saveProductAction} className="space-y-5 rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm">
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
          <span className="text-sm font-semibold text-neutral-700">Precio</span>
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

      <label className="space-y-2 block">
        <span className="text-sm font-semibold text-neutral-700">Descripción</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-md border border-brand-border px-3 py-2 outline-none focus:border-brand"
        />
      </label>

      <label className="space-y-2 block">
        <span className="text-sm font-semibold text-neutral-700">Imagen</span>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full rounded-md border border-brand-border bg-brand-paper px-3 py-2 text-sm"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-semibold text-neutral-700">
        <input name="isVisible" type="checkbox" defaultChecked={product?.isVisible ?? true} className="size-4 accent-brand" />
        Visible en tienda
      </label>

      <div className="flex items-center gap-3">
        <button className="h-11 rounded-md bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark">
          Guardar producto
        </button>
        <Link href="/app/productos" className="text-sm font-semibold text-neutral-600 hover:text-neutral-950">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
