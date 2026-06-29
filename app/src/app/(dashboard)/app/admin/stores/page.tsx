import { getCountryCommerceConfig } from "@/config/countries";
import { storePlans } from "@/config/plans";
import { extendStoreTrialAction, updateStorePlanAction } from "@/lib/actions";
import { requireSuperAdmin } from "@/lib/admin";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const stores = await getPrisma().store.findMany({
    include: { owner: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const rows = await Promise.all(
    stores.map(async (store) => ({
      store,
      productUsage: await getProductUsage(store.id),
      sellerAiUsage: await getSellerAiUsage(store.id),
      planState: getStorePlanState(store),
    })),
  );

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Admin</p>
      <h1 className="text-4xl font-black">Tiendas</h1>
      {params.ok ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{params.error}</p> : null}
      <div className="mt-6 overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        <div className="grid min-w-[1180px] grid-cols-[1.1fr_0.9fr_0.9fr_0.7fr_0.7fr_1.2fr_0.8fr_0.9fr_1.5fr] gap-3 border-b border-brand-border px-4 py-3 text-xs font-black uppercase text-neutral-500">
          <span>Nombre</span>
          <span>Slug</span>
          <span>Plan</span>
          <span>País</span>
          <span>Moneda</span>
          <span>Owner</span>
          <span>Productos</span>
          <span>Seller AI</span>
          <span>Acciones</span>
        </div>
        <div className="overflow-x-auto">
        {rows.map(({ store, productUsage, sellerAiUsage, planState }) => {
          const country = getCountryCommerceConfig(store.countryCode);
          const trialEndsAt = planState.trialEndsAt ? planState.trialEndsAt.toLocaleDateString(country.locale) : "Sin fecha";
          return (
            <div key={store.id} className="grid min-w-[1180px] grid-cols-[1.1fr_0.9fr_0.9fr_0.7fr_0.7fr_1.2fr_0.8fr_0.9fr_1.5fr] gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
              <span>
                <span className="block font-black">{store.name}</span>
                <span className="text-xs font-semibold text-neutral-500">{planState.planStatus === "EXPIRED" ? "Trial vencido" : `Creada ${store.createdAt.toLocaleDateString(country.locale)}`}</span>
              </span>
              <span className="font-mono text-xs">{store.slug}</span>
              <span>
                <span className="block font-black">{planState.planCode}</span>
                <span className="text-xs font-semibold text-neutral-500">Trial: {trialEndsAt}</span>
              </span>
              <span>{country.countryCode}</span>
              <span>{store.currency ?? country.defaultCurrency}</span>
              <span>{store.owner.email}</span>
              <span>{productUsage.used} / {productUsage.limit}</span>
              <span>{sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido"}</span>
              <span className="space-y-2">
                <form action={updateStorePlanAction} className="flex gap-2">
                  <input type="hidden" name="storeId" value={store.id} />
                  <select name="plan" defaultValue={planState.planCode} className="h-9 min-w-0 flex-1 rounded-md border border-brand-border bg-white px-2 text-xs font-bold">
                    {Object.values(storePlans).map((plan) => (
                      <option key={plan.code} value={plan.code}>
                        {plan.code}
                      </option>
                    ))}
                  </select>
                  <button className="h-9 rounded-md bg-brand px-3 text-xs font-black text-white">Guardar</button>
                </form>
                <form action={extendStoreTrialAction} className="flex gap-2">
                  <input type="hidden" name="storeId" value={store.id} />
                  <input name="days" type="number" min="1" max="90" defaultValue="14" className="h-9 w-16 rounded-md border border-brand-border bg-white px-2 text-xs font-bold" />
                  <button className="h-9 rounded-md border border-brand-border bg-white px-3 text-xs font-black text-brand-dark">Extender trial</button>
                </form>
              </span>
            </div>
          );
        })}
        </div>
        {rows.length === 0 ? <p className="p-6 text-center text-neutral-500">No hay tiendas.</p> : null}
      </div>
    </section>
  );
}
