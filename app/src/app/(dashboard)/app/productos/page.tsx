import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteProductAction, toggleProductAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getProductUsage } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const { store } = await requireStore();
  const [products, productUsage] = await Promise.all([
    getPrisma().product.findMany({
      where: { storeId: store.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    getProductUsage(store.id),
  ]);

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Productos</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Catálogo</h1>
        </div>
        {productUsage.isLimitReached || productUsage.trialExpired ? (
          <a href="mailto:hola@jakawi.com?subject=Solicitar%20upgrade%20JAKAWI" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-dark px-5 font-bold text-white hover:bg-brand">
            Solicitar upgrade
          </a>
        ) : (
          <Link href="/app/productos/nuevo" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            <Plus className="size-4" />
            Agregar producto
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-paper px-3 py-2.5 shadow-sm md:px-4 md:py-3">
        <p className="text-sm font-black text-brand-dark">Productos {productUsage.used}/{productUsage.limit}</p>
        {productUsage.isNearLimit && !productUsage.isLimitReached ? <p className="mt-1 text-sm font-semibold text-amber-700">Estás cerca del límite de tu plan.</p> : null}
        {productUsage.isLimitReached ? <p className="mt-1 text-sm font-semibold text-red-700">Llegaste al límite de productos de tu plan. Actualiza tu plan para agregar más.</p> : null}
        {productUsage.trialExpired ? <p className="mt-1 text-sm font-semibold text-red-700">Tu prueba gratuita terminó. Puedes elegir un plan para seguir agregando productos.</p> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {products.length === 0 ? (
          <div className="p-6 text-center text-sm font-semibold text-neutral-600 md:p-8">Aún no tienes productos.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {products.map((product) => (
              <div key={product.id} className="grid grid-cols-[64px_1fr] gap-3 p-3 md:grid-cols-[72px_1fr_auto] md:items-center md:p-4">
                <img src={product.imageUrl ?? "/placeholder-product.svg"} alt="" className="size-16 rounded-md bg-brand-muted object-cover md:size-[72px]" />
                <div className="min-w-0">
                  <h2 className="truncate font-black leading-5 text-brand-dark">{product.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-neutral-500">
                    {formatMoney({
                      amountCents: product.priceCents,
                      currency: store.currency ?? product.currency,
                      countryCode: store.countryCode ?? "BO",
                      locale: store.locale,
                    })}{" "}
                    · {product.category?.name ?? "Sin categoría"} · {product.isVisible ? "Visible" : "Oculto"}
                  </p>
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-2 md:col-span-1 md:flex md:flex-wrap md:justify-end">
                  <Link href={`/app/productos/${product.id}/editar`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-2 text-sm font-semibold hover:border-neutral-950 md:px-3">
                    <Pencil className="size-4" />
                    Editar
                  </Link>
                  <form action={toggleProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-2 text-sm font-semibold hover:border-neutral-950 md:px-3">
                      {product.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {product.isVisible ? "Ocultar" : "Mostrar"}
                    </button>
                  </form>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-2 text-sm font-semibold text-red-700 hover:border-red-500 md:px-3">
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
