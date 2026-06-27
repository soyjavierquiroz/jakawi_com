import { BrandLogo } from "@/components/BrandLogo";
import { registrationConfig } from "@/config/registration";
import { VisitorProvider } from "@/context/VisitorContext";
import { RegistrationForm } from "./RegistrationForm";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; country?: string; plan?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-[920px] rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8 lg:p-10">
        <BrandLogo />
        <h1 className="mt-8 text-3xl font-black sm:text-4xl">{registrationConfig.title}</h1>
        <p className="mt-2 text-base text-neutral-600 sm:text-lg">{registrationConfig.subtitle}</p>
        <VisitorProvider>
          <RegistrationForm error={params.error} initialCountryCode={params.country} selectedPlan={params.plan} />
        </VisitorProvider>
      </div>
    </main>
  );
}
