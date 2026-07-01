import { ArrowRight, HandCoins, Network, Store, UsersRound } from "lucide-react";
import Link from "next/link";
import { getSuperAdminDashboardStats, requireSuperAdmin } from "@/lib/admin";
import { storePlans, type StorePlanCode } from "@/config/plans";

const adminLinks = [
  { label: "Tiendas", href: "/app/admin/stores", active: true },
  { label: "Referidos", hint: "Próximamente" },
  { label: "Partners", hint: "Próximamente" },
  { label: "Comisiones", hint: "Próximamente" },
];

const growthModules = [
  {
    title: "Referidos",
    icon: Network,
    text: "Tiendas que recomiendan otras tiendas.",
    detail: "Créditos y beneficios para tiendas que recomiendan JAKAWI.",
  },
  {
    title: "Partners",
    icon: UsersRound,
    text: "Personas/agencias que activan comercios.",
    detail: "Canales que crean y acompañan nuevas cuentas.",
  },
  {
    title: "Comisiones",
    icon: HandCoins,
    text: "Pagos manuales futuros por ventas confirmadas.",
    detail: "Control manual de comisiones antes de automatizar pagos.",
  },
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

export default async function AdminPage() {
  await requireSuperAdmin();
  const stats = await getSuperAdminDashboardStats();

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold leading-none text-brand-dark">Superadmin</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Operación comercial de JAKAWI</h1>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-neutral-600">Panel operativo para tiendas, planes y la base futura de crecimiento comercial.</p>
        </div>
        <Link href="/app/admin/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <Store className="size-4" />
          Ver tiendas
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {adminLinks.map((link) =>
          link.active ? (
            <Link key={link.label} href={link.href} className="inline-flex h-11 items-center justify-between gap-3 rounded-md border border-brand-border bg-brand-paper px-4 text-sm font-black text-brand-dark shadow-sm hover:border-brand">
              {link.label}
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <div key={link.label} className="inline-flex h-11 items-center justify-between gap-3 rounded-md border border-dashed border-brand-border bg-white/60 px-4 text-sm font-black text-neutral-500">
              {link.label}
              <span className="text-[11px] uppercase">{link.hint}</span>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de tiendas" value={stats.totalStores} detail="Espacios comerciales creados" />
        <StatCard label="Tiendas activas" value={stats.activeStores} detail="Sin trial vencido" />
        <StatCard label="Trials activos" value={stats.activeTrials} detail="Pruebas en curso" />
        <StatCard label="Trials vencidos" value={stats.expiredTrials} detail="Requieren seguimiento" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
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
        </div>

        <div className="grid gap-3">
          <StatCard label="Seller AI habilitado" value={stats.sellerAiEnabledStores} detail="Tiendas con plan operativo" />
          <StatCard label="Clientes/señales" value={stats.leadSignals} detail="Señales acumuladas" />
          <StatCard label="Clicks WhatsApp" value={stats.whatsappClicksLast7Days} detail="Últimos 7 días" />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-dark">Crecimiento</p>
            <h2 className="mt-1 text-2xl font-black text-brand-dark">Próximos módulos</h2>
          </div>
          <span className="rounded-full border border-brand-border bg-brand-paper px-3 py-1 text-xs font-black uppercase text-neutral-500">Próximamente</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {growthModules.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.title} className="rounded-lg border border-dashed border-brand-border bg-white/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-brand-dark">{module.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">{module.text}</p>
                  </div>
                  <Icon className="size-5 shrink-0 text-brand" />
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-neutral-500">{module.detail}</p>
                <span className="mt-4 inline-flex rounded-full bg-brand-muted px-3 py-1 text-xs font-black text-neutral-500">Próximamente</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
