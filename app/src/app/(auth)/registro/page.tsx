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
    <main className="grid min-h-dvh place-items-start overflow-x-hidden bg-background px-4 py-6 sm:place-items-center sm:px-5 sm:py-10">
      <div className="w-full max-w-[860px] rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-8 lg:p-10">
        <BrandLogo />
        <h1 className="mt-6 text-3xl font-black sm:mt-8 sm:text-4xl">{registrationConfig.title}</h1>
        <p className="mt-2 text-base text-neutral-600 sm:text-lg">{registrationConfig.subtitle}</p>
        <VisitorProvider>
          <RegistrationForm error={params.error} initialCountryCode={params.country} selectedPlan={params.plan} />
        </VisitorProvider>
      </div>
    </main>
  );
}
