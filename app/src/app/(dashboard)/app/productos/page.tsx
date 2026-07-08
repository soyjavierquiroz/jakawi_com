import { Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { deleteProductAction, toggleFeaturedProductAction, toggleProductAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getProductUsage } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { cn } from "@/lib/ui";
import type { Prisma } from "@prisma/client";

const filters = [
  { key: "all", label: "Todos" },
  { key: "featured", label: "Destacados" },
  { key: "visible", label: "Visibles" },
  { key: "hidden", label: "Ocultos" },
  { key: "uncategorized", label: "Sin categoría" },
] as const;

function buildQuery(params: { filter?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  const value = search.toString();
  return value ? `?${value}` : "";
}

function filterWhere(filter: string): Prisma.ProductWhereInput {
  if (filter === "featured") return { isFeatured: true };
  if (filter === "visible") return { isVisible: true };
  if (filter === "hidden") return { isVisible: false };
  if (filter === "uncategorized") return { categoryId: null };
  return {};
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const activeFilter = filters.some((filter) => filter.key === params.filter) ? params.filter ?? "all" : "all";
  const q = params.q?.trim() ?? "";
  const searchWhere: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const [products, productUsage] = await Promise.all([
    getPrisma().product.findMany({
      where: { AND: [{ storeId: store.id }, filterWhere(activeFilter), searchWhere] },
      include: { category: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
    }),
    getProductUsage(store.id),
  ]);

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Productos</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Catálogo</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-neutral-600">Organiza lo que el cliente puede ver hoy. Los destacados aparecen primero en tu tienda y ayudan a Seller AI a recomendar mejor.</p>
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
        <p className="text-sm font-black text-brand-dark">{productUsage.used} de {productUsage.limit} productos</p>
        <p className="mt-1 text-sm font-semibold text-neutral-600">Visible publica el producto en la tienda. Destacado lo sube al inicio del catálogo.</p>
        {productUsage.isNearLimit && !productUsage.isLimitReached ? <p className="mt-1 text-sm font-semibold text-amber-700">Estás cerca del límite de tu plan.</p> : null}
        {productUsage.isLimitReached ? <p className="mt-1 text-sm font-semibold text-red-700">Llegaste al límite de productos de tu plan. Actualiza tu plan para agregar más.</p> : null}
        {productUsage.trialExpired ? <p className="mt-1 text-sm font-semibold text-red-700">Tu prueba gratuita terminó. Puedes elegir un plan para seguir agregando productos.</p> : null}
      </div>

      <form action="/app/productos" className="rounded-lg border border-brand-border bg-brand-paper p-3 shadow-sm">
        {activeFilter !== "all" ? <input type="hidden" name="filter" value={activeFilter} /> : null}
        <label className="flex h-11 items-center gap-2 rounded-md bg-brand-muted px-3">
          <Search className="size-4 shrink-0 text-neutral-500" />
          <input name="q" defaultValue={q} placeholder="Buscar nombre, slug o categoría..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" />
        </label>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={`/app/productos${buildQuery({ filter: filter.key, q })}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-brand-border bg-brand-paper px-3 text-xs font-black text-brand-dark",
              activeFilter === filter.key && "border-brand-dark bg-brand-dark text-white",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        {products.length === 0 ? (
          <div className="p-6 text-center md:p-8">
            <p className="text-lg font-black text-brand-dark">{productUsage.used === 0 && !q && activeFilter === "all" ? "Tu catálogo todavía está vacío." : "No hay productos con estos filtros."}</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-neutral-600">
              {productUsage.used === 0 && !q && activeFilter === "all"
                ? "Agrega tu primer producto con una imagen clara, precio y descripción simple para que tu tienda pública tenga algo listo para vender."
                : "Prueba limpiar la búsqueda o cambiar el filtro para volver a ver tu catálogo."}
            </p>
            {productUsage.isLimitReached || productUsage.trialExpired ? (
              <a href="mailto:hola@jakawi.com?subject=Solicitar%20upgrade%20JAKAWI" className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-dark px-5 font-bold text-white hover:bg-brand">
                Solicitar upgrade
              </a>
            ) : productUsage.used === 0 && !q && activeFilter === "all" ? (
              <Link href="/app/productos/nuevo" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
                <Plus className="size-4" />
                Crear producto
              </Link>
            ) : (
              <Link href="/app/productos" className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-5 font-bold text-brand-dark hover:border-brand">
                Ver todos
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {products.map((product) => (
              <div key={product.id} className="grid grid-cols-[64px_1fr] gap-3 p-3 md:grid-cols-[72px_1fr_auto] md:items-center md:p-4">
                <Image src={product.imageUrl ?? "/placeholder-product.svg"} alt="" width={72} height={72} sizes="72px" unoptimized className="size-16 rounded-md bg-brand-muted object-cover md:size-[72px]" />
                <div className="min-w-0">
                  <h2 className="truncate font-black leading-5 text-brand-dark">{product.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-neutral-500">
                    {formatMoney({
                      amountCents: product.priceCents,
                      currency: store.currency ?? product.currency,
                      countryCode: store.countryCode ?? "BO",
                      locale: store.locale,
                    })}{" "}
                    · {product.category?.name ?? "Sin categoría"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-black">
                    <span className={cn("rounded-full px-2 py-0.5", product.isVisible ? "bg-brand-soft text-brand-dark" : "bg-neutral-100 text-neutral-600")}>{product.isVisible ? "Visible" : "Oculto"}</span>
                    {product.isFeatured ? <span className="rounded-full bg-brand-lime px-2 py-0.5 text-brand-dark">Destacado</span> : null}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-4 gap-2 md:col-span-1 md:flex md:flex-wrap md:justify-end">
                  <Link href={`/app/productos/${product.id}/editar`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-2 text-sm font-semibold hover:border-neutral-950 md:px-3">
                    <Pencil className="size-4" />
                    <span className="hidden min-[390px]:inline">Editar</span>
                  </Link>
                  <form action={toggleFeaturedProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-brand-border px-2 text-sm font-semibold text-brand-dark hover:border-brand md:px-3">
                      <Star className={cn("size-4", product.isFeatured && "fill-brand-lime text-brand-dark")} />
                      <span className="hidden min-[390px]:inline">{product.isFeatured ? "Quitar" : "Destacar"}</span>
                    </button>
                  </form>
                  <form action={toggleProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-2 text-sm font-semibold hover:border-neutral-950 md:px-3">
                      {product.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      <span className="hidden min-[390px]:inline">{product.isVisible ? "Ocultar" : "Mostrar"}</span>
                    </button>
                  </form>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-2 text-sm font-semibold text-red-700 hover:border-red-500 md:px-3">
                      <Trash2 className="size-4" />
                      <span className="hidden min-[390px]:inline">Borrar</span>
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
