import { Bot, Boxes, ExternalLink, Link as LinkIcon, MessageCircle, Store as StoreIcon, UsersRound } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { getCountryCommerceConfig } from "@/config/countries";
import { getPlanPriceForCountry } from "@/config/regional-pricing";
import { getPublicStoreUrl, siteConfig } from "@/config/site";
import { requireStore } from "@/lib/auth";
import { getPlanLimitLabel, getProductUsage, getSellerAiUsage, getStorePlanState } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { getStorefrontFlow } from "@/lib/storefront-flow";

export default async function DashboardPage() {
  const { user, store } = await requireStore();
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalProducts, visibleProducts, whatsappClicks, leadCount, productUsage, sellerAiUsage] = await Promise.all([
    getPrisma().product.count({ where: { storeId: store.id } }),
    getPrisma().product.count({ where: { storeId: store.id, isVisible: true } }),
    getPrisma().analyticsEvent.count({ where: { storeId: store.id, type: "WHATSAPP_CLICK", createdAt: { gte: since } } }),
    getPrisma().lead.count({ where: { storeId: store.id } }),
    getProductUsage(store.id),
    getSellerAiUsage(store.id),
  ]);
  const publicUrl = getPublicStoreUrl(store.slug);
  const flow = getStorefrontFlow(store.plan);
  const planState = getStorePlanState(store);
  const country = getCountryCommerceConfig(store.countryCode);
  const regionalPlanPrice = getPlanPriceForCountry(flow.planCode, store.countryCode);
  const trialDateLabel = planState.trialEndsAt ? planState.trialEndsAt.toLocaleDateString(country.locale) : null;
  const planStatusLabel = planState.trialExpired ? "Prueba terminada" : flow.planCode === "TRIAL" ? `Prueba hasta ${trialDateLabel}` : "Activo";
  const firstName = user.firstName ?? user.name?.split(" ")[0] ?? store.name;
  const hasVoiceNotes = Boolean(store.sellerIntroAudioUrl || store.sellerGuidanceAudioUrl || store.sellerHandoffAudioUrl);

  const stats = [
    { label: "Link público", value: store.slug, detail: "Tienda pública", icon: LinkIcon, href: publicUrl, external: true },
    { label: "Plan actual", value: flow.planName, detail: `${regionalPlanPrice.priceLabel} · ${planStatusLabel}`, icon: StoreIcon, href: siteConfig.routes.plan },
    { label: "Productos", value: `${productUsage.used} / ${productUsage.limit}`, detail: `${visibleProducts} visibles de ${totalProducts}`, icon: Boxes, href: siteConfig.routes.products },
    { label: "Seller AI", value: sellerAiUsage.enabled ? `${sellerAiUsage.used} / ${getPlanLimitLabel(sellerAiUsage.limit)}` : "No incluido", detail: "Conversaciones mensuales", icon: Bot, href: siteConfig.routes.sellerAi },
    { label: "Leads con contexto", value: leadCount, detail: "Oportunidades preparadas", icon: UsersRound, href: siteConfig.routes.leads },
    { label: "Clicks WhatsApp", value: whatsappClicks, detail: "Últimos 7 días", icon: MessageCircle, href: siteConfig.routes.whatsapp },
  ];

  const nextStep = (() => {
    if (!planState.sellerAiEnabled) {
      return {
        title: "Agrega productos y comparte tu link.",
        text: "Seller AI está disponible en Pro/Premium. Por ahora tu mejor avance es ordenar el catálogo y mover clientes a WhatsApp.",
        label: productUsage.used === 0 ? "Agregar producto" : "Compartir link público",
        href: productUsage.used === 0 ? siteConfig.routes.newProduct : publicUrl,
        external: productUsage.used !== 0,
      };
    }
    if (!hasVoiceNotes) {
      return {
        title: "Configura la voz del vendedor para generar más confianza.",
        text: "Tres audios cortos ayudan a que el cliente sienta presencia humana antes de pasar a WhatsApp.",
        label: "Configurar Seller AI",
        href: siteConfig.routes.sellerAi,
      };
    }
    if (productUsage.used === 0) {
      return {
        title: "Agrega tu primer producto.",
        text: "Seller AI necesita catálogo para asesorar mejor y preparar consultas con contexto.",
        label: "Agregar producto",
        href: siteConfig.routes.newProduct,
      };
    }
    if (leadCount > 0) {
      return {
        title: "Revisa tus leads con contexto.",
        text: "JAKAWI ya está recordando consultas, dudas y códigos para que cierres mejor por WhatsApp.",
        label: "Ver leads",
        href: siteConfig.routes.leads,
      };
    }
    return {
      title: "Comparte tu espacio comercial.",
      text: "Publica el link en redes y deja que Seller AI prepare mejores consultas por WhatsApp.",
      label: "Ver tienda pública",
      href: publicUrl,
      external: true,
    };
  })();

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Inicio</p>
          <h1 className="text-3xl font-black md:text-4xl">Hola, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Gestiona tu espacio comercial y prepara mejores consultas por WhatsApp.</p>
        </div>
        {productUsage.isLimitReached || productUsage.trialExpired ? (
          <a href="mailto:hola@jakawi.com?subject=Solicitar%20upgrade%20JAKAWI" className="inline-flex h-11 items-center justify-center rounded-md bg-brand-dark px-5 font-bold text-white hover:bg-brand">
            Solicitar upgrade
          </a>
        ) : (
          <Link href={siteConfig.routes.newProduct} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            Agregar producto
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Tu tienda está activa</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Comparte este link en redes o estados.</p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-dark">Online</span>
        </div>
        <code className="mt-3 block break-all rounded-md bg-brand-muted px-3 py-3 text-sm text-neutral-800">{publicUrl}</code>
        <div className="mt-3 grid grid-cols-2 gap-3 md:flex md:items-center">
          <a href={publicUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-dark px-4 font-bold text-white hover:bg-brand">
            <ExternalLink className="size-4" />
            Ver tienda
          </a>
          <CopyButton value={publicUrl} />
        </div>
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
        <p className="text-sm font-black text-brand-dark">Siguiente paso recomendado</p>
        <h2 className="mt-2 text-xl font-black md:text-2xl">{nextStep.title}</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-neutral-600">{nextStep.text}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:flex md:items-center">
          <Link href={nextStep.href} target={nextStep.external ? "_blank" : undefined} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
            {nextStep.label}
          </Link>
          <Link href={siteConfig.routes.sellerAi} className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-5 font-bold text-brand-dark hover:border-brand">
            Revisar Seller AI
          </Link>
        </div>
        {productUsage.isNearLimit && !productUsage.isLimitReached ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Estás cerca del límite de tu plan: productos {productUsage.used} de {productUsage.limit} usados.</p> : null}
        {productUsage.isLimitReached ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Llegaste al límite de productos de tu plan. Tu plan permite {productUsage.limit} productos.</p> : null}
        {planState.trialExpired ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Tu prueba gratuita terminó. Puedes elegir un plan para seguir agregando productos y usando JAKAWI.</p> : null}
        {flow.planCode === "TRIAL" && !planState.trialExpired && trialDateLabel ? <p className="mt-4 rounded-md bg-brand-muted px-3 py-2 text-sm font-bold text-brand-dark">Tu prueba termina el {trialDateLabel}.</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} target={stat.external ? "_blank" : undefined} className="min-h-[132px] rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm transition hover:border-brand hover:shadow-md md:p-5">
            <stat.icon className="size-5 text-brand" />
            <p className="mt-3 truncate text-xl font-black text-brand-dark md:mt-4 md:text-2xl">{stat.value}</p>
            <p className="mt-1 text-sm font-black text-neutral-700">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-500">{stat.detail}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg bg-brand-dark p-5 text-white md:p-6">
        <h2 className="text-xl font-black md:text-2xl">Commercial Space + Seller AI + WhatsApp</h2>
        <p className="mt-2 max-w-2xl text-white/70">Seller AI prepara. La voz del vendedor genera confianza. WhatsApp cierra. JAKAWI recuerda.</p>
        <Link href={siteConfig.routes.sellerAi} className="mt-5 inline-flex h-11 items-center rounded-md bg-brand-lime px-5 font-bold text-brand-dark hover:bg-brand-yellow">
          Configurar Seller AI
        </Link>
      </div>
    </section>
  );
}
