import { updateStoreAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";

export default async function StoreSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;

  return (
    <section>
      <p className="text-sm font-bold text-brand-dark">Mi tienda</p>
      <h1 className="text-4xl font-black">Configura tu tienda</h1>
      {params.ok ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Cambios guardados.</p> : null}

      <form action={updateStoreAction} className="mt-6 space-y-5 rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Nombre</span>
            <input name="name" required defaultValue={store.name} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Slug</span>
            <input name="slug" required defaultValue={store.slug} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-neutral-700">Descripción corta</span>
          <textarea name="description" rows={3} defaultValue={store.description ?? ""} className="w-full rounded-md border border-brand-border px-3 py-2 outline-none focus:border-brand" />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">WhatsApp</span>
            <input name="whatsapp" required defaultValue={store.whatsapp} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Instagram</span>
            <input name="instagram" defaultValue={store.instagram ?? ""} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">TikTok</span>
            <input name="tiktok" defaultValue={store.tiktok ?? ""} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Foto de portada</span>
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="w-full rounded-md border border-brand-border px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Logo</span>
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="w-full rounded-md border border-brand-border px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">Guardar cambios</button>
      </form>
    </section>
  );
}
