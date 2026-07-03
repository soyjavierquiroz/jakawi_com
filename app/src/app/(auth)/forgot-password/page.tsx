import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { requestPasswordResetAction } from "@/lib/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm ring-1 ring-black/5">
        <BrandLogo />
        <h1 className="mt-8 text-3xl font-black">Recuperar password</h1>
        <p className="mt-2 text-neutral-600">Ingresa el email de tu cuenta JAKAWI.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {params.sent ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{params.sent}</p> : null}

        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <input name="email" type="email" required className="h-11 w-full rounded-md border border-neutral-200 px-3 outline-none focus:border-brand" />
          </label>
          <button className="h-11 w-full rounded-md bg-brand font-bold text-white transition hover:bg-brand-dark">Enviar instrucciones</button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/login" className="font-bold text-brand-dark">
            Volver a login
          </Link>
        </p>
      </div>
    </main>
  );
}
