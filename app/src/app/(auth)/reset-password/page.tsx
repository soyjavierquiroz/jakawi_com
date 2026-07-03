import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { resetPasswordAction } from "@/lib/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm ring-1 ring-black/5">
        <BrandLogo />
        <h1 className="mt-8 text-3xl font-black">Nuevo password</h1>
        <p className="mt-2 text-neutral-600">Elige un password nuevo para tu cuenta.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {!token ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Link incompleto. Solicita uno nuevo.</p> : null}

        <form action={resetPasswordAction} className="mt-6 space-y-4">
          <input name="token" type="hidden" value={token} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Nuevo password</span>
            <input name="password" type="password" required minLength={8} className="h-11 w-full rounded-md border border-neutral-200 px-3 outline-none focus:border-brand" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Confirmar password</span>
            <input name="confirmPassword" type="password" required minLength={8} className="h-11 w-full rounded-md border border-neutral-200 px-3 outline-none focus:border-brand" />
          </label>
          <button disabled={!token} className="h-11 w-full rounded-md bg-brand font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300">
            Actualizar password
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/forgot-password" className="font-bold text-brand-dark">
            Solicitar otro link
          </Link>
        </p>
      </div>
    </main>
  );
}
