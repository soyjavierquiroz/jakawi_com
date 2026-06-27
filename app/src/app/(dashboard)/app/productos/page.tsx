import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteProductAction, toggleProductAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const { store } = await requireStore();
  const products = await getPrisma().product.findMany({
    where: { storeId: store.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Productos</p>
          <h1 className="text-4xl font-black">Catálogo</h1>
        </div>
        <Link href="/app/productos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <Plus className="size-4" />
          Agregar producto
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {products.length === 0 ? (
          <div className="p-8 text-center text-neutral-600">Aún no tienes productos.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {products.map((product) => (
              <div key={product.id} className="grid gap-4 p-4 md:grid-cols-[64px_1fr_auto] md:items-center">
                <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="size-16 rounded-md object-cover" />
                <div>
                  <h2 className="font-black">{product.name}</h2>
                  <p className="text-sm text-neutral-500">
                    {formatMoney(product.priceCents, product.currency)} - {product.category?.name ?? "Sin categoría"} - {product.isVisible ? "Visible" : "Oculto"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/app/productos/${product.id}/editar`} className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-semibold hover:border-neutral-950">
                    <Pencil className="size-4" />
                    Editar
                  </Link>
                  <form action={toggleProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-semibold hover:border-neutral-950">
                      {product.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {product.isVisible ? "Ocultar" : "Mostrar"}
                    </button>
                  </form>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:border-red-500">
                      <Trash2 className="size-4" />
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
