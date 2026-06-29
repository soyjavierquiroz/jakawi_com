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
    <section className="space-y-4 md:space-y-6">
      <div>
        <p className="text-sm font-bold leading-none text-brand-dark">Categorías</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Organiza tu catálogo</h1>
      </div>
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}

      <form id="crear-categoria" action={createCategoryAction} className="grid gap-2 rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm sm:grid-cols-[1fr_auto] md:p-4">
        <input name="name" required placeholder="Nueva categoría" className="h-11 flex-1 rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark">
          <Plus className="size-4" />
          Agregar categoría
        </button>
      </form>

      <div className="divide-y divide-brand-border overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {categories.length === 0 ? (
          <div className="p-6 text-center md:p-8">
            <p className="text-sm font-semibold text-neutral-600">Organiza tus productos por categorías.</p>
            <a href="#crear-categoria" className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
              Crear categoría
            </a>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center md:p-4">
              <form action={renameCategoryAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="categoryId" value={category.id} />
                <input name="name" defaultValue={category.name} className="h-10 min-w-0 rounded-md border border-brand-border px-3 font-semibold outline-none focus:border-brand" aria-label={`Nombre de categoría ${category.name}`} />
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-semibold hover:border-neutral-950">
                  <Pencil className="size-4" />
                  Editar
                </button>
              </form>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-neutral-500">Productos: {category._count.products}</span>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:border-red-500">
                    <Trash2 className="size-4" />
                    Borrar
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
