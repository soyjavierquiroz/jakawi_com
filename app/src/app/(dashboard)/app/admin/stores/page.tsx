import { getCountryCommerceConfig } from "@/config/countries";
import { requireSuperAdmin } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export default async function AdminStoresPage() {
  await requireSuperAdmin();
  const stores = await getPrisma().store.findMany({
    include: { owner: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Admin</p>
      <h1 className="text-4xl font-black">Tiendas</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-brand-border bg-brand-paper shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.8fr_0.7fr_1.2fr_0.9fr] gap-3 border-b border-brand-border px-4 py-3 text-xs font-black uppercase text-neutral-500">
          <span>Nombre</span>
          <span>Slug</span>
          <span>Plan</span>
          <span>País</span>
          <span>Moneda</span>
          <span>Owner</span>
          <span>Creada</span>
        </div>
        {stores.map((store) => {
          const country = getCountryCommerceConfig(store.countryCode);
          return (
            <div key={store.id} className="grid grid-cols-[1.2fr_1fr_0.7fr_0.8fr_0.7fr_1.2fr_0.9fr] gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
              <span className="font-black">{store.name}</span>
              <span className="font-mono text-xs">{store.slug}</span>
              <span>{store.plan}</span>
              <span>{country.countryCode}</span>
              <span>{store.currency ?? country.defaultCurrency}</span>
              <span>{store.owner.email}</span>
              <span>{store.createdAt.toLocaleDateString(country.locale)}</span>
            </div>
          );
        })}
        {stores.length === 0 ? <p className="p-6 text-center text-neutral-500">No hay tiendas.</p> : null}
      </div>
    </section>
  );
}
