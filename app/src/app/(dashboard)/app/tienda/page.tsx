import { CountryCurrencyFields } from "@/components/commerce/CountryCurrencyFields";
import { CopyButton } from "@/components/CopyButton";
import { CommercialTemplateSettings } from "@/components/dashboard/CommercialTemplateSettings";
import { PlanUsageCompactCard } from "@/components/dashboard/PlanUsageCompactCard";
import { VisualIdentitySettings } from "@/components/dashboard/VisualIdentitySettings";
import { Bot, ExternalLink, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { getPublicStoreUrl, siteConfig } from "@/config/site";
import { updateStoreAction } from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";

export default async function StoreSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const [productUsage, sellerAiUsage] = await Promise.all([getProductUsage(store.id), getSellerAiUsage(store.id)]);
  const planState = getStorePlanState(store);
  const trialLabel = planState.trialEndsAt ? planState.trialEndsAt.toLocaleDateString(store.locale ?? "es-BO") : null;
  const publicUrl = getPublicStoreUrl(store.slug);
  const productUsageLabel = `${productUsage.used} / ${productUsage.limit}`;
  const sellerAiUsageLabel = sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido";
  const voiceNotesLabel = planState.sellerAiEnabled ? "Disponible" : "Pro/Premium";

  return (
    <section className="space-y-5 md:space-y-6">
      <p className="text-sm font-bold text-brand-dark">Mi espacio</p>
      <h1 className="text-3xl font-black md:text-4xl">{store.name}</h1>
      <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Mantén actualizada la información pública de tu negocio. Tu espacio comercial sigue siendo el link que ve el cliente.</p>
      {params.ok ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Cambios guardados.</p> : null}
      {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error === "voice-plan" ? "Las notas de voz están disponibles en Pro/Premium." : params.error}</p> : null}

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <LinkIcon className="mt-1 size-5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-brand-dark">Link público</p>
            <code className="mt-1 block break-all rounded-md bg-brand-muted px-3 py-3 text-sm text-neutral-800">{publicUrl}</code>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:flex md:items-center">
          <a href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-dark px-4 font-bold text-white hover:bg-brand">
            <ExternalLink className="size-4" />
            Ver espacio
          </a>
          <CopyButton value={publicUrl} />
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-neutral-500">Plan actual</p>
            <p className="mt-1 text-xl font-black text-brand-dark">{planState.planName}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-600">{planState.trialExpired ? "Prueba terminada" : planState.planStatus === "TRIALING" && trialLabel ? `Prueba hasta ${trialLabel}` : "Activo"}</p>
          </div>
          <a href="mailto:hola@jakawi.com?subject=Solicitar%20upgrade%20JAKAWI" className="inline-flex h-10 items-center justify-center rounded-md bg-brand-dark px-4 text-sm font-black text-white hover:bg-brand">
            Solicitar upgrade
          </a>
        </div>
        {productUsage.isNearLimit ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Estás cerca del límite de productos.</p> : null}
      </section>

      <PlanUsageCompactCard productUsageLabel={productUsageLabel} sellerAiUsageLabel={sellerAiUsageLabel} voiceNotesLabel={voiceNotesLabel} />

      <CommercialTemplateSettings store={store} />

      <VisualIdentitySettings store={store} />

      <form action={updateStoreAction} className="space-y-5 rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
        <div>
          <p className="text-sm font-black text-brand-dark">Información básica</p>
          <p className="mt-1 text-sm font-semibold text-neutral-600">Nombre, slogan, descripción y canales visibles para tus clientes.</p>
        </div>
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
          <span className="text-sm font-semibold text-neutral-700">Slogan comercial</span>
          <input
            name="commercialTagline"
            placeholder="Ej. Celulares seleccionados para comprar con confianza"
            defaultValue={store.commercialTagline ?? ""}
            className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
          />
          <span className="block text-xs font-semibold leading-5 text-neutral-500">Una frase corta que aparecerá en la portada de tu espacio comercial.</span>
        </label>
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
        <details className="group rounded-md border border-brand-border bg-brand-muted">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black text-brand-dark">
            País y moneda
            <span className="text-lg leading-none group-open:rotate-45">+</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm font-semibold text-neutral-600">Esto define cómo se muestran los precios en tu espacio comercial.</p>
            <div className="mt-4">
              <CountryCurrencyFields initialCountryCode={store.countryCode} initialCurrency={store.currency} compact />
            </div>
            <p className="mt-3 text-xs font-semibold text-amber-700">Si cambias la moneda, revisa que tus precios sigan teniendo sentido.</p>
          </div>
        </details>
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
        <button className="h-11 w-full rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark sm:w-auto">Guardar cambios</button>
      </form>

      <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-brand-dark">Seller AI y notas de voz</p>
            <h2 className="mt-1 text-xl font-black md:text-2xl">Configurar Seller AI y notas de voz</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-neutral-600">Las notas de bienvenida, orientación y cierre ahora viven en el centro de configuración del agente.</p>
          </div>
          <Link href={siteConfig.routes.sellerAi} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            <Bot className="size-4" />
            Ir a Seller AI
          </Link>
        </div>
      </section>
    </section>
  );
}
