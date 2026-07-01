import { DashboardNav } from "@/components/DashboardNav";
import { getPublicStoreUrl } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });
  const partnerPortal = await getPrisma().partner.findFirst({ where: { portalUserId: user.id }, select: { id: true } });
  const publicUrl = store ? getPublicStoreUrl(store.slug) : undefined;

  return (
    <div className="min-h-dvh bg-background">
      <DashboardNav publicUrl={publicUrl} hasPartnerPortal={Boolean(partnerPortal)} />
      <main className="pt-[4.75rem] pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pl-72 md:pt-0 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
