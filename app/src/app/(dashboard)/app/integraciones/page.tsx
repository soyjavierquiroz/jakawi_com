import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, LockKeyhole, Plug } from "lucide-react";
import {
  deleteStorePixelIntegrationAction,
  disableStorePixelIntegrationAction,
  upsertStorePixelIntegrationAction,
} from "@/lib/actions";
import { requireStore } from "@/lib/auth";
import { isEncryptionConfigured } from "@/lib/crypto/encryption";
import {
  ownerEncryptionStatusLabel,
  ownerEncryptionStatusText,
  ownerIntegrationReasonLabel,
  ownerPrivateTokenLabel,
  ownerServerEventsLabel,
} from "@/lib/integration-owner-copy";
import {
  buildIntegrationStatus,
  getIntegrationQuickStatus,
  type IntegrationQuickStatus,
  type IntegrationStatusSnapshot,
} from "@/lib/integration-status";
import { getPrisma } from "@/lib/prisma";
import {
  canPrepareStorePixelCapi,
  storePixelPlatformLabel,
  storePixelPlatforms,
  storePixelStatusLabel,
  storePixelStatuses,
} from "@/lib/store-pixel-integrations";
import { cn } from "@/lib/ui";

const platformHints: Record<StorePixelPlatform, string> = {
  META: "Browser Pixel mide desde el navegador con consentimiento marketing. Los eventos del servidor permanecen apagados hasta completar la configuración segura.",
  TIKTOK: "Guarda el Pixel ID y deja el Browser Pixel preparado por tienda. Los eventos del servidor quedan reservados para un hito futuro.",
  GOOGLE: "Preparado para Google Ads/Analytics futuro. En este hito no se envían eventos a Google.",
};

const platformCapiNotes: Record<StorePixelPlatform, string> = {
  META: "Para operar eventos del servidor se necesita integración activa, Pixel ID, token privado guardado, cifrado seguro y consentimiento marketing.",
  TIKTOK: "Los eventos del servidor quedan solo preparados; no hay envío externo desde servidor en este hito.",
  GOOGLE: "Google queda preparado para un hito futuro. Solo queda listo el ID de referencia.",
};

function statusClass(status: StorePixelStatus) {
  if (status === StorePixelStatus.ACTIVE) return "bg-green-50 text-green-700";
  if (status === StorePixelStatus.DISABLED) return "bg-neutral-100 text-neutral-600";
  if (status === StorePixelStatus.ERROR) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

function quickStatusLabel(status: IntegrationQuickStatus) {
  if (status === "ready") return "Listo";
  if (status === "configured_off") return "Configurado pero apagado";
  if (status === "not_implemented") return "No implementado";
  return "Falta configuración";
}

function quickStatusClass(status: IntegrationQuickStatus) {
  if (status === "ready") return "bg-green-50 text-green-700";
  if (status === "configured_off") return "bg-amber-50 text-amber-800";
  if (status === "not_implemented") return "bg-neutral-100 text-neutral-600";
  return "bg-red-50 text-red-700";
}

function quickStatusText(status: IntegrationQuickStatus) {
  if (status === "ready") return "La integración tiene la configuración mínima para operar cuando el visitante acepta marketing.";
  if (status === "configured_off") return "Hay datos guardados, pero alguna parte está apagada o protegida por seguridad.";
  if (status === "not_implemented") return "Esta plataforma queda visible como preparación; no envía eventos externos desde JAKAWI.";
  return "Falta un dato clave antes de que la integración pueda quedar lista.";
}

function yesNo(value: boolean) {
  return value ? "Sí" : "No";
}

function statusLineClass(value: boolean) {
  return value ? "text-green-700" : "text-neutral-600";
}

function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <p className="text-xs font-black uppercase text-neutral-500">{title}</p>
      {reasons.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs font-semibold text-neutral-700">
          {reasons.map((reason) => (
            <li key={reason}>{ownerIntegrationReasonLabel(reason)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs font-semibold text-green-700">sin bloqueos de configuración</p>
      )}
    </div>
  );
}

function IntegrationStatusPanel({ status }: { status: IntegrationStatusSnapshot }) {
  const quickStatus = getIntegrationQuickStatus(status);

  return (
    <div className="mt-5 rounded-md bg-brand-muted p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-black text-brand-dark">Estado operativo</p>
        <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black", quickStatusClass(quickStatus))}>{quickStatusLabel(quickStatus)}</span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-neutral-600">{quickStatusText(quickStatus)}</p>

      <div className="mt-3 grid gap-2 text-xs font-semibold text-neutral-600 sm:grid-cols-2 lg:grid-cols-4">
        <p className="rounded-md bg-white px-3 py-2">Pixel ID: <span className={statusLineClass(status.pixelIdPresent)}>{status.pixelIdPresent ? "Presente" : "Falta Pixel ID"}</span></p>
        <p className="rounded-md bg-white px-3 py-2">Browser Pixel: <span className={statusLineClass(status.browserEnabled)}>{status.browserEnabled ? "Preparado" : "Apagado"}</span></p>
        <p className="rounded-md bg-white px-3 py-2">Browser Pixel operativo: <span className={statusLineClass(status.browserOperational)}>{yesNo(status.browserOperational)}</span></p>
        <p className="rounded-md bg-white px-3 py-2">{ownerServerEventsLabel()}: <span className={statusLineClass(status.serverEnabled)}>{status.serverEnabled ? "Preparado" : "Apagado"}</span></p>
        <p className="rounded-md bg-white px-3 py-2">{ownerServerEventsLabel()} operativo: <span className={statusLineClass(status.serverOperational)}>{yesNo(status.serverOperational)}</span></p>
        <p className="rounded-md bg-white px-3 py-2">Token: <span className={statusLineClass(status.tokenPresent)}>{status.tokenPresent ? "Guardado" : "No guardado"}</span></p>
        <p className="rounded-md bg-white px-3 py-2">Test Event Code: <span className={statusLineClass(status.testEventCodePresent)}>{status.testEventCodePresent ? "Presente" : "Opcional"}</span></p>
        <p className="rounded-md bg-white px-3 py-2">Consentimiento marketing: <span className="text-green-700">{status.requiresMarketingConsent ? "Requiere consentimiento marketing" : "No requerido en este hito"}</span></p>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ReasonList title="Browser Pixel" reasons={status.browserBlockedReasons} />
        <ReasonList title={ownerServerEventsLabel()} reasons={status.serverBlockedReasons} />
      </div>
    </div>
  );
}

export default async function StoreIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { store } = await requireStore();
  const params = await searchParams;
  const encryptionReady = isEncryptionConfigured();
  const integrations = await getPrisma().storePixelIntegration.findMany({
    where: { storeId: store.id },
    orderBy: { platform: "asc" },
    select: {
      id: true,
      storeId: true,
      platform: true,
      pixelId: true,
      accessTokenEncrypted: true,
      capiEnabled: true,
      browserPixelEnabled: true,
      testEventCode: true,
      status: true,
    },
  });
  const byPlatform = new Map(integrations.map((integration) => [integration.platform, integration]));

  return (
    <section className="space-y-5 md:space-y-6">
      <div>
        <p className="text-sm font-bold text-brand-dark">Integraciones</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Pixels por tienda</h1>
        <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-neutral-600">
          Revisa si cada integración tiene configuración suficiente para operar. Los eventos externos solo se envían si la integración está activa y el visitante aceptó marketing.
        </p>
      </div>

      {params.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Configuración guardada.</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{params.error}</p> : null}

      <section className={cn("rounded-lg border p-4 text-sm font-semibold shadow-sm", encryptionReady ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
        <div className="flex items-start gap-3">
          {encryptionReady ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
          <div>
            <p className="font-black">{ownerEncryptionStatusLabel(encryptionReady)}</p>
            <p className="mt-1 leading-6">{ownerEncryptionStatusText(encryptionReady)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {storePixelPlatforms.map((platform) => {
          const integration = byPlatform.get(platform);
          const operationalStatus = buildIntegrationStatus(platform, integration);
          const status = integration?.status ?? StorePixelStatus.DRAFT;
          const supportsCapi = canPrepareStorePixelCapi(platform);
          const canEnableCapi = supportsCapi && encryptionReady;

          return (
            <article key={platform} className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-muted text-brand-dark">
                      <Plug className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-brand-dark">{storePixelPlatformLabel(platform)}</h2>
                      <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-neutral-600">{platformHints[platform]}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", statusClass(status))}>{storePixelStatusLabel(status)}</span>
                        {operationalStatus.tokenPresent ? <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2.5 py-1 text-xs font-black text-brand-dark"><LockKeyhole className="size-3" /> Token privado guardado</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                {integration ? (
                  <div className="grid gap-2 text-xs font-semibold text-neutral-600 sm:grid-cols-2 lg:min-w-64 lg:grid-cols-1">
                    <p className="rounded-md bg-brand-muted px-3 py-2">Browser Pixel: {integration.browserPixelEnabled ? "Preparado" : "Apagado"}</p>
                    <p className="rounded-md bg-brand-muted px-3 py-2">Eventos del servidor: {integration.capiEnabled ? "Preparado" : "Apagado"}</p>
                  </div>
                ) : null}
              </div>

              <IntegrationStatusPanel status={operationalStatus} />

              <form action={upsertStorePixelIntegrationAction} className="mt-5 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="returnTo" value="/app/integraciones" />
                <input type="hidden" name="platform" value={platform} />

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">Pixel ID</span>
                  <input name="pixelId" defaultValue={integration?.pixelId ?? ""} placeholder={platform === StorePixelPlatform.META ? "123456789012345" : platform === StorePixelPlatform.TIKTOK ? "C1234567890ABCDEFGH" : "Pixel ID"} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">Test Event Code</span>
                  <input name="testEventCode" defaultValue={integration?.testEventCode ?? ""} placeholder="TEST12345" className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">Estado</span>
                  <select name="status" defaultValue={status} className="h-11 w-full rounded-md border border-brand-border bg-white px-3 font-semibold outline-none focus:border-brand">
                    {storePixelStatuses.map((option) => (
                      <option key={option} value={option}>
                        {storePixelStatusLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">{ownerPrivateTokenLabel()}</span>
                  <input name="accessToken" type="password" autoComplete="off" placeholder={operationalStatus.tokenPresent ? "Token guardado; dejar vacío para conservar" : "No se muestra después de guardarlo"} className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
                </label>

                <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
                  <label className="flex min-h-11 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
                    <input type="checkbox" name="browserPixelEnabled" defaultChecked={integration?.browserPixelEnabled ?? false} className="size-4 accent-brand" />
                    Browser Pixel
                  </label>
                  <label className={cn("flex min-h-11 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark", !canEnableCapi && "text-neutral-400")}>
                    <input type="checkbox" name="capiEnabled" defaultChecked={integration?.capiEnabled ?? false} disabled={!canEnableCapi} className="size-4 accent-brand disabled:accent-neutral-300" />
                    Eventos del servidor
                  </label>
                  <label className="flex min-h-11 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark">
                    <input type="checkbox" name="clearToken" className="size-4 accent-brand" />
                    Borrar token
                  </label>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:col-span-2">
                  <button className="h-11 rounded-md bg-brand px-5 text-sm font-black text-white hover:bg-brand-dark">Guardar integración</button>
                  {integration ? (
                    <>
                      <button formAction={disableStorePixelIntegrationAction} className="h-11 rounded-md border border-brand-border bg-white px-5 text-sm font-black text-brand-dark hover:border-brand">
                        Deshabilitar
                      </button>
                      <button formAction={deleteStorePixelIntegrationAction} className="h-11 rounded-md border border-red-200 bg-white px-5 text-sm font-black text-red-700 hover:bg-red-50">
                        Eliminar
                      </button>
                    </>
                  ) : null}
                </div>
              </form>

              <p className="mt-3 rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600">
                {platformCapiNotes[platform]} No se usan pixels ni tokens de JAKAWI para eventos de tiendas.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
