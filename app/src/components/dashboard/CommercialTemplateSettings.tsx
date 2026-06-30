import { Check, Gem, LayoutGrid, Smartphone, Sparkles } from "lucide-react";
import { AVAILABLE_COMMERCIAL_SPACE_TEMPLATES, normalizeCommercialTemplate, type CommercialTemplateId } from "@/config/commercial-templates";
import { updateStoreCommercialTemplateAction } from "@/lib/actions";
import { cn } from "@/lib/ui";

type CommercialTemplateSettingsProps = {
  store: {
    commercialTemplate?: string | null;
  };
};

const templateIcons: Record<CommercialTemplateId, typeof Sparkles> = {
  SHOWCASE: Sparkles,
  BOUTIQUE: Gem,
  APP_COMMERCE: Smartphone,
  COMPACT_CATALOG: LayoutGrid,
  SOCIAL_DROP: Sparkles,
};

function TemplatePreview({ templateId }: { templateId: CommercialTemplateId }) {
  if (templateId === "APP_COMMERCE") {
    return (
      <div className="rounded-md border border-brand-border bg-white p-2">
        <div className="overflow-hidden rounded-md bg-neutral-950 p-1.5">
          <div className="rounded-[0.9rem] bg-rose-50 p-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-rose-300" />
                <div className="h-2 w-14 rounded-full bg-neutral-800/80" />
              </div>
              <div className="size-5 rounded-full bg-white shadow-sm" />
            </div>
            <div className="mt-2 h-14 rounded-xl bg-gradient-to-br from-rose-400 via-pink-200 to-amber-100 p-2 shadow-sm">
              <div className="h-2 w-16 rounded-full bg-white/85" />
              <div className="mt-2 h-3 w-20 rounded-full bg-white" />
            </div>
            <div className="mt-2 flex gap-1.5 overflow-hidden">
              <div className="h-6 w-14 shrink-0 rounded-full bg-neutral-900" />
              <div className="h-6 w-14 shrink-0 rounded-full bg-white shadow-sm" />
              <div className="h-6 w-14 shrink-0 rounded-full bg-white shadow-sm" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="h-12 rounded-lg bg-white shadow-sm" />
              <div className="h-12 rounded-lg bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === "BOUTIQUE") {
    return (
      <div className="rounded-md border border-brand-border bg-white p-2">
        <div className="overflow-hidden rounded-md bg-rose-50">
          <div className="relative h-16 bg-gradient-to-br from-rose-100 via-pink-50 to-white p-2">
            <div className="h-2 w-12 rounded-full bg-rose-300/80" />
            <div className="mt-2 h-3 w-20 rounded-full bg-rose-500/75" />
            <div className="absolute bottom-2 right-2 size-9 rounded-xl bg-rose-200 shadow-sm" />
          </div>
          <div className="-mt-2 mx-2 rounded-md bg-white/90 p-2 shadow-sm">
            <div className="h-2 w-16 rounded-full bg-rose-400/70" />
            <div className="mt-2 flex -space-x-2">
              <div className="size-7 rounded-lg bg-rose-100 ring-2 ring-white" />
              <div className="size-7 rounded-lg bg-pink-200 ring-2 ring-white" />
              <div className="size-7 rounded-lg bg-rose-300 ring-2 ring-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-brand-border bg-white p-2">
      <div className="overflow-hidden rounded-md bg-brand-dark">
        <div className="h-16 bg-gradient-to-br from-brand-dark to-neutral-900 p-2">
          <div className="h-2 w-14 rounded-full bg-brand-lime" />
          <div className="mt-2 h-3 w-24 rounded-full bg-white/70" />
          <div className="mt-2 h-2 w-16 rounded-full bg-white/35" />
        </div>
        <div className="-mt-3 mx-2 rounded-md bg-white p-2 shadow-sm">
          <div className="h-10 rounded bg-brand-muted" />
          <div className="mt-2 h-2 w-20 rounded-full bg-brand-dark/70" />
        </div>
      </div>
    </div>
  );
}

export function CommercialTemplateSettings({ store }: CommercialTemplateSettingsProps) {
  const activeTemplate = normalizeCommercialTemplate(store.commercialTemplate);

  return (
    <section className="rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
      <div>
        <p className="text-sm font-black text-brand-dark">Estilo del espacio comercial</p>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-neutral-600">
          Elige cómo quieres presentar tus productos a tus clientes. JAKAWI mantiene una estructura optimizada para vender.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {AVAILABLE_COMMERCIAL_SPACE_TEMPLATES.map((template) => {
          const isActive = activeTemplate === template.id;
          const Icon = templateIcons[template.id];

          return (
            <form key={template.id} action={updateStoreCommercialTemplateAction}>
              <input type="hidden" name="commercialTemplate" value={template.id} />
              <button
                type="submit"
                disabled={isActive}
                aria-pressed={isActive}
                className={cn(
                  "h-full w-full rounded-lg border border-brand-border bg-white p-3 text-left transition hover:border-brand hover:shadow-sm disabled:cursor-default md:p-4",
                  isActive && "border-brand bg-brand-soft ring-2 ring-brand/10",
                )}
              >
                <TemplatePreview templateId={template.id} />
                <span className="mt-3 flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-base font-black text-brand-dark">
                      <Icon className="size-4 text-brand" />
                      {template.label}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-6 text-neutral-600">{template.description}</span>
                  </span>
                  {isActive ? (
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {template.bestFor.map((item) => (
                    <span key={item} className="rounded-full bg-brand-muted px-2.5 py-1 text-[11px] font-black text-neutral-600">
                      {item}
                    </span>
                  ))}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
