import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { verifyEmailWithToken } from "@/lib/auth-account";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const result = token ? await verifyEmailWithToken(token) : null;
  const ok = params.status === "ok" || result?.ok;
  const error = ok ? null : (params.error ?? (!token ? "Link incompleto. Solicita uno nuevo." : result && !result.ok ? result.error : null));

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm ring-1 ring-black/5">
        <BrandLogo />
        <h1 className="mt-8 text-3xl font-black">Verificar email</h1>
        {ok ? (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">Email verificado correctamente.</p>
        ) : null}
        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/login" className="font-bold text-brand-dark">
            Ir a login
          </Link>
        </p>
      </div>
    </main>
  );
}
