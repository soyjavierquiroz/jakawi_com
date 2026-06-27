import { Pencil, Plus, Trash2 } from "lucide-react";
import { createCategoryAction, deleteCategoryAction, renameCategoryAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const categories = await getPrisma().category.findMany({
    where: { storeId: store.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Categorías</p>
      <h1 className="text-4xl font-black">Organiza tu catálogo</h1>
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}

      <form action={createCategoryAction} className="mt-6 flex gap-3 rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
        <input name="name" required placeholder="Nueva categoría" className="h-11 flex-1 rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
        <button className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark">
          <Plus className="size-4" />
          Crear
        </button>
      </form>

      <div className="mt-6 divide-y divide-brand-border rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {categories.map((category) => (
          <div key={category.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <form action={renameCategoryAction} className="flex gap-3">
              <input type="hidden" name="categoryId" value={category.id} />
              <input name="name" defaultValue={category.name} className="h-10 flex-1 rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-semibold hover:border-neutral-950">
                <Pencil className="size-4" />
                Renombrar
              </button>
            </form>
            <form action={deleteCategoryAction} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-neutral-500">{category._count.products} productos</span>
              <input type="hidden" name="categoryId" value={category.id} />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:border-red-500">
                <Trash2 className="size-4" />
                Borrar
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
