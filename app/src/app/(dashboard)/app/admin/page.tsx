import { CreditCard, Gift, HandCoins, Network, Store, TrendingUp, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSuperAdminDashboardStats, requireSuperAdmin } from "@/lib/admin";
import { storePlans, type StorePlanCode } from "@/config/plans";
import { formatConversionContext, formatConversionRate, type GrowthConversionTopItem } from "@/lib/growth-conversion-metrics";
import { formatCommissionMoney } from "@/lib/partner-commissions";
import { formatRate, formatRevenueRate, formatRevenueTotals } from "@/lib/revenue-attribution-metrics";
import { formatStorePaymentMoney } from "@/lib/store-payments";

const growthModules = [
  {
    title: "Referidos",
    icon: Network,
    text: "Tiendas que recomiendan JAKAWI.",
    detail: "Tiendas referidoras y atribuciones de comercios nuevos.",
    href: "/app/admin/referrals",
  },
  {
    title: "Partners",
    icon: UsersRound,
    text: "Canales comerciales que activan comercios.",
    detail: "Partners con links, destinos y portal read-only.",
    href: "/app/admin/partners",
  },
  {
    title: "Revenue",
    icon: TrendingUp,
    text: "Revenue confirmado por fuente atribuida.",
    detail: "Métricas operativas desde pagos manuales confirmados.",
    href: "/app/admin/revenue",
  },
  {
    title: "Pagos",
    icon: CreditCard,
    text: "Ledger manual de pagos y renovaciones.",
    detail: "Registra pagos externos. No ejecuta cobros automáticos ni cambia planes.",
    href: "/app/admin/payments",
  },
  {
    title: "Comisiones",
    icon: HandCoins,
    text: "Pagos manuales a partners.",
    detail: "Registrar, aprobar, cancelar y marcar pagadas. No ejecuta pagos automáticos.",
    href: "/app/admin/commissions",
  },
  {
    title: "Recompensas",
    icon: Gift,
    text: "Beneficios internos para tiendas que recomiendan JAKAWI.",
    detail: "Beneficios manuales a tiendas referidoras. No se aplican automáticamente.",
    href: "/app/admin/rewards",
  },
];

const quickActions = [
  { label: "Ver tiendas", href: "/app/admin/stores", icon: Store },
  { label: "Ver referidos", href: "/app/admin/referrals", icon: Network },
  { label: "Ver partners", href: "/app/admin/partners", icon: UsersRound },
  { label: "Ver comisiones", href: "/app/admin/commissions", icon: HandCoins },
  { label: "Ver recompensas", href: "/app/admin/rewards", icon: Gift },
  { label: "Ver pagos", href: "/app/admin/payments", icon: CreditCard },
  { label: "Ver revenue", href: "/app/admin/revenue", icon: TrendingUp },
];

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black leading-8 text-brand-dark">{value}</p>
      {detail ? <p className="mt-1 text-sm font-semibold text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function topConverterDetail(item: GrowthConversionTopItem | null) {
  if (!item) return "Datos iniciales";
  return `${item.signups} registros atribuidos · ${formatConversionContext(item)}`;
}

export default async function AdminPage() {
  await requireSuperAdmin();
  const stats = await getSuperAdminDashboardStats();

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Operación comercial de JAKAWI</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Panel operativo para tiendas, planes, señales y crecimiento comercial manual.</p>
        </div>
        <Link href="/app/admin/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <Store className="size-4" />
          Ver tiendas
        </Link>
      </div>

      <AdminNav />

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black text-brand-dark">Operación</p>
          <h2 className="mt-1 text-2xl font-black text-brand-dark">Tiendas, planes y señales</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total de tiendas" value={stats.totalStores} detail="Espacios comerciales creados" />
          <StatCard label="Tiendas activas" value={stats.activeStores} detail="Sin trial vencido" />
          <StatCard label="Trials activos" value={stats.activeTrials} detail="Pruebas en curso" />
          <StatCard label="Trials vencidos" value={stats.expiredTrials} detail="Requieren seguimiento" />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-brand-dark">Tiendas por plan</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500">Distribución comercial actual.</p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-dark">Planes</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(Object.keys(storePlans) as StorePlanCode[]).map((planCode) => (
              <div key={planCode} className="rounded-md bg-brand-muted px-4 py-3">
                <p className="text-xs font-black text-neutral-500">{planCode}</p>
                <p className="mt-1 text-xl font-black leading-6 text-brand-dark">{stats.planCounts[planCode]}</p>
                <p className="mt-1 truncate text-xs font-semibold text-neutral-600">{storePlans[planCode].name}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-3">
          <StatCard label="Seller AI habilitado" value={stats.sellerAiEnabledStores} detail="Tiendas con plan operativo" />
          <StatCard label="Clientes/señales" value={stats.leadSignals} detail="Señales acumuladas" />
          <StatCard label="Clicks WhatsApp" value={stats.whatsappClicksLast7Days} detail="Últimos 7 días" />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Revenue / Pagos</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Pagos registrados manualmente</h2>
          </div>
          <span className="rounded-full border border-brand-border bg-brand-paper px-3 py-1 text-xs font-black uppercase text-neutral-500">No implica cobro automático</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue confirmado" value={formatRevenueTotals(stats.revenueAttributionSummary.totalRevenue)} detail={`${stats.revenueAttributionSummary.confirmedPayments} pagos confirmados`} />
          <StatCard label="Revenue 30 días" value={formatRevenueTotals(stats.revenueAttributionSummary.last30DaysRevenue)} detail="Revenue manual reciente" />
          <StatCard label="Atribuido a partners" value={formatRevenueTotals(stats.revenueAttributionSummary.partnerRevenue)} detail="Desde stores atribuidas a partners" />
          <StatCard label="Atribuido a referidoras" value={formatRevenueTotals(stats.revenueAttributionSummary.storeReferralRevenue)} detail="Desde stores referidas por tiendas" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Orgánico / sin atribución" value={formatRevenueTotals(stats.revenueAttributionSummary.organicRevenue)} detail="Sin partner/store referral" />
          <StatCard label="Tiendas con pago" value={stats.revenueAttributionSummary.confirmedStores} detail="Al menos un pago confirmado" />
          <StatCard label="Conversión registro → pago" value={formatRate(stats.revenueAttributionSummary.attributedFunnel.total.signupToPaymentRate, "Sin registros")} detail={`${stats.revenueAttributionSummary.attributedFunnel.total.paidStores} tiendas con pago confirmado`} />
          <StatCard label="Revenue por registro" value={formatRevenueRate(stats.revenueAttributionSummary.attributedFunnel.total.revenuePerSignup, "Sin registros")} detail="Funnel atribuido" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pagos pendientes" value={stats.storePaymentStats.PENDING.count} detail={formatStorePaymentMoney(stats.storePaymentStats.PENDING.amountCents)} />
          <StatCard label="Pagos confirmados" value={stats.storePaymentStats.CONFIRMED.count} detail="Ledger manual" />
          <StatCard label="Tiendas con pago" value={stats.storePaymentStats.confirmedStoreCount} detail="Al menos un pago confirmado" />
          <Link href="/app/admin/revenue" className="rounded-lg border border-brand-border bg-brand-paper p-4 font-black text-brand-dark shadow-sm hover:border-brand">
            <span className="flex items-center gap-2 text-xs uppercase text-neutral-500">
              <TrendingUp className="size-4 text-brand" />
              Ver revenue
            </span>
            <span className="mt-2 block text-2xl leading-8">Abrir métricas</span>
            <span className="mt-1 block text-sm font-semibold text-neutral-500">Revenue confirmado y funnel.</span>
          </Link>
        </div>
        <p className="text-sm font-semibold text-neutral-600">Pagos registrados manualmente. No implica cobro automático.</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Crecimiento</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Referidos, partners, comisiones y recompensas</h2>
          </div>
          <span className="rounded-full border border-brand-border bg-brand-paper px-3 py-1 text-xs font-black uppercase text-neutral-500">Manual</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Clicks últimos 7 días" value={stats.growthConversionSummary.all.last7Days.clicks} detail="Referidos y partners" />
          <StatCard label="Registros atribuidos 7 días" value={stats.growthConversionSummary.all.last7Days.signups} detail="Click → registro" />
          <StatCard label="Conversión 7 días" value={formatConversionRate(stats.growthConversionSummary.all.last7Days.conversionRate)} detail={formatConversionContext(stats.growthConversionSummary.all.last7Days)} />
          <StatCard label="Clicks últimos 30 días" value={stats.growthConversionSummary.all.last30Days.clicks} detail="Tráfico generado" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Registros atribuidos 30 días" value={stats.growthConversionSummary.all.last30Days.signups} detail="Partners y tiendas referidoras" />
          <StatCard label="Conversión 30 días" value={formatConversionRate(stats.growthConversionSummary.all.last30Days.conversionRate)} detail={formatConversionContext(stats.growthConversionSummary.all.last30Days)} />
          <StatCard label="Top partner por registros" value={stats.growthConversionSummary.topConverters.topPartnerBySignups?.secondary ?? "Datos iniciales"} detail={topConverterDetail(stats.growthConversionSummary.topConverters.topPartnerBySignups)} />
          <StatCard label="Top partner por conversión" value={stats.growthConversionSummary.topConverters.topPartnerByConversion?.secondary ?? "Datos iniciales"} detail={topConverterDetail(stats.growthConversionSummary.topConverters.topPartnerByConversion)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Top tienda referidora" value={stats.growthConversionSummary.topConverters.topStoreBySignups?.secondary ?? "Datos iniciales"} detail={topConverterDetail(stats.growthConversionSummary.topConverters.topStoreBySignups)} />
          <StatCard label="Top destino partner" value={stats.growthConversionSummary.topConverters.topDestinationBySignups?.secondary ?? "Datos iniciales"} detail={topConverterDetail(stats.growthConversionSummary.topConverters.topDestinationBySignups)} />
          <StatCard label="Conversión partner 30 días" value={formatConversionRate(stats.growthConversionSummary.partner.last30Days.conversionRate)} detail={formatConversionContext(stats.growthConversionSummary.partner.last30Days)} />
          <StatCard label="Conversión referidos 30 días" value={formatConversionRate(stats.growthConversionSummary.storeReferral.last30Days.conversionRate)} detail={formatConversionContext(stats.growthConversionSummary.storeReferral.last30Days)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Partners activos" value={stats.activePartners} detail="Canales comerciales habilitados" />
          <StatCard label="Destinos activos" value={stats.activePartnerDestinations} detail="Links configurados de partners" />
          <StatCard label="Tiendas referidoras" value={stats.storeReferralAttributions} detail="Tiendas atribuidas a tiendas" />
          <StatCard label="Atribución partner" value={stats.partnerAttributions} detail="Tiendas atribuidas a partners" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Comisiones pendientes" value={stats.partnerCommissionStats.PENDING.count} detail={formatCommissionMoney(stats.partnerCommissionStats.PENDING.amountCents)} />
          <StatCard label="Comisiones aprobadas" value={stats.partnerCommissionStats.APPROVED.count} detail={formatCommissionMoney(stats.partnerCommissionStats.APPROVED.amountCents)} />
          <StatCard label="Comisiones pagadas" value={stats.partnerCommissionStats.PAID.count} detail={formatCommissionMoney(stats.partnerCommissionStats.PAID.amountCents)} />
          <StatCard label="Control manual" value="Sin auto-pagos" detail="No ejecuta pagos automáticos" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Recompensas pendientes" value={stats.storeReferralRewardStats.PENDING.count} detail="Beneficios por revisar" />
          <StatCard label="Recompensas aprobadas" value={stats.storeReferralRewardStats.APPROVED.count} detail="Pendientes de aplicar manualmente" />
          <StatCard label="Recompensas aplicadas" value={stats.storeReferralRewardStats.APPLIED.count} detail="Registradas como aplicadas" />
          <StatCard label="Beneficios manuales" value="Sin auto-aplicar" detail="No toca billing ni planes" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {growthModules.map((module) => {
            const Icon = module.icon;
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-brand-dark">{module.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">{module.text}</p>
                  </div>
                  <Icon className="size-5 shrink-0 text-brand" />
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-neutral-500">{module.detail}</p>
                <span className="mt-4 inline-flex rounded-full bg-brand-muted px-3 py-1 text-xs font-black text-neutral-500">{module.href ? "Activo" : "Próximamente"}</span>
              </>
            );

            return module.href ? (
              <Link key={module.title} href={module.href} className="rounded-lg border border-brand-border bg-white/70 p-5 shadow-sm transition hover:border-brand hover:shadow-md">
                {content}
              </Link>
            ) : (
              <article key={module.title} className="rounded-lg border border-dashed border-brand-border bg-white/70 p-5 shadow-sm">
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black text-brand-dark">Acciones rápidas</p>
          <h2 className="mt-1 text-2xl font-black text-brand-dark">Operación diaria</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-paper px-3 text-sm font-black text-brand-dark shadow-sm hover:border-brand">
                <Icon className="size-4 shrink-0 text-brand" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
