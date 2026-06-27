import { DashboardNav } from "@/components/DashboardNav";
import { getPublicStoreUrl } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });
  const publicUrl = store ? getPublicStoreUrl(store.slug) : undefined;

  return (
    <div className="min-h-dvh bg-background">
      <DashboardNav publicUrl={publicUrl} />
      <main className="md:pl-72">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}
