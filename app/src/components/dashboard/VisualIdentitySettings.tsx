"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { updateStoreVisualIdentityAction } from "@/lib/actions";
import {
  buildCommercialSpaceTheme,
  commercialThemeToCssVariables,
  COMMERCIAL_THEME_PRESETS,
  DEFAULT_COMMERCIAL_THEME,
  isValidHexColor,
  normalizeHexColor,
  type CommercialThemePresetKey,
} from "@/lib/commercial-theme";
import { cn } from "@/lib/ui";

type VisualIdentitySettingsProps = {
  store: {
    brandThemePreset?: string | null;
    brandPrimaryColor?: string | null;
    brandBackgroundColor?: string | null;
    brandAccentColor?: string | null;
    themeColor?: string | null;
  };
};

const presetEntries = Object.entries(COMMERCIAL_THEME_PRESETS) as Array<[CommercialThemePresetKey, (typeof COMMERCIAL_THEME_PRESETS)[CommercialThemePresetKey]]>;
const presetLabels: Record<CommercialThemePresetKey, string> = {
  JAKAWI: "JAKAWI",
  Minimal: "Minimal",
  Boutique: "Boutique",
  Premium: "Premium",
  Natural: "Natural",
  Energia: "Energía",
};

function getInitialPreset(value?: string | null): CommercialThemePresetKey {
  if (value && value in COMMERCIAL_THEME_PRESETS) return value as CommercialThemePresetKey;
  return DEFAULT_COMMERCIAL_THEME.preset;
}

function ColorControl({
  label,
  name,
  value,
  fallback,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const colorValue = isValidHexColor(value) ? normalizeHexColor(value, fallback) : normalizeHexColor(fallback, DEFAULT_COMMERCIAL_THEME.primary);

  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <span className="grid grid-cols-[44px_1fr] overflow-hidden rounded-md border border-brand-border bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
        <input type="color" value={colorValue} onChange={(event) => onChange(event.target.value)} className="h-11 w-11 cursor-pointer border-0 bg-transparent p-1" aria-label={label} />
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 min-w-0 border-0 px-3 font-mono text-sm font-bold uppercase outline-none"
          placeholder={fallback}
          spellCheck={false}
        />
      </span>
    </label>
  );
}

export function VisualIdentitySettings({ store }: VisualIdentitySettingsProps) {
  const initialPreset = getInitialPreset(store.brandThemePreset);
  const initialPresetTheme = COMMERCIAL_THEME_PRESETS[initialPreset];
  const [preset, setPreset] = useState<CommercialThemePresetKey>(initialPreset);
  const [primary, setPrimary] = useState(() => normalizeHexColor(store.brandPrimaryColor ?? store.themeColor, initialPresetTheme.primary));
  const [background, setBackground] = useState(() => normalizeHexColor(store.brandBackgroundColor, initialPresetTheme.background));
  const [accent, setAccent] = useState(() => normalizeHexColor(store.brandAccentColor, initialPresetTheme.accent));

  const theme = useMemo(
    () =>
      buildCommercialSpaceTheme({
        brandThemePreset: preset,
        brandPrimaryColor: primary,
        brandBackgroundColor: background,
        brandAccentColor: accent,
      }),
    [accent, background, preset, primary],
  );
  const previewStyle = commercialThemeToCssVariables(theme) as CSSProperties;

  function applyPreset(nextPreset: CommercialThemePresetKey) {
    const nextTheme = COMMERCIAL_THEME_PRESETS[nextPreset];
    setPreset(nextPreset);
    setPrimary(nextTheme.primary);
    setBackground(nextTheme.background);
    setAccent(nextTheme.accent);
  }

  function markCustomColor(setter: (value: string) => void, value: string) {
    setter(value);
  }

  return (
    <form action={updateStoreVisualIdentityAction} className="space-y-5 rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
      <input type="hidden" name="brandThemePreset" value={preset} />
      <div>
        <p className="text-sm font-black text-brand-dark">Identidad visual</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">Haz que tu espacio comercial se sienta como tu marca sin perder claridad para tus clientes.</p>
      </div>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-neutral-700">Presets rápidos</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {presetEntries.map(([key, presetTheme]) => {
            const isActive = preset === key && theme.primary === presetTheme.primary && theme.background === presetTheme.background && theme.accent === presetTheme.accent;

            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                aria-pressed={isActive}
                className={cn(
                  "min-w-0 rounded-md border border-brand-border bg-white p-2 text-left transition hover:border-brand",
                  isActive && "border-brand bg-brand-soft ring-2 ring-brand/10",
                )}
              >
                <span className="block truncate text-xs font-black text-brand-dark">{presetLabels[key]}</span>
                <span className="mt-2 flex gap-1">
                  {[presetTheme.primary, presetTheme.background, presetTheme.accent].map((color) => (
                    <span key={color} className="size-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <ColorControl label="Color principal" name="brandPrimaryColor" value={primary} fallback={COMMERCIAL_THEME_PRESETS[preset].primary} onChange={(value) => markCustomColor(setPrimary, value)} />
          <ColorControl label="Color de fondo" name="brandBackgroundColor" value={background} fallback={COMMERCIAL_THEME_PRESETS[preset].background} onChange={(value) => markCustomColor(setBackground, value)} />
          <ColorControl label="Color de acento" name="brandAccentColor" value={accent} fallback={COMMERCIAL_THEME_PRESETS[preset].accent} onChange={(value) => markCustomColor(setAccent, value)} />
          <p className="rounded-md bg-brand-muted px-3 py-2 text-xs font-semibold leading-5 text-neutral-600 sm:col-span-3 lg:col-span-1">
            Si el color es muy claro, JAKAWI ajustará el texto automáticamente para mantener legibilidad.
          </p>
        </div>

        <div className="rounded-md border border-brand-border bg-white p-3">
          <p className="mb-2 text-sm font-black text-brand-dark">Vista previa</p>
          <div className="rounded-md border border-[var(--space-border)] bg-[var(--space-background)] p-3 text-[var(--space-background-contrast)]" style={previewStyle}>
            <div className="rounded-md bg-[var(--space-primary)] px-3 py-2 text-[var(--space-primary-contrast)]">
              <p className="text-sm font-black">Tu espacio comercial</p>
              <p className="text-xs font-semibold opacity-80">Consulta clara, marca propia.</p>
            </div>
            <div className="mt-3 rounded-md border border-[var(--space-border)] bg-[var(--space-surface)] p-3 text-[var(--space-surface-contrast)] shadow-sm">
              <span className="inline-flex rounded-full bg-[var(--space-accent)] px-2 py-1 text-[11px] font-black text-[var(--space-accent-contrast)]">Destacado</span>
              <h3 className="mt-3 text-base font-black">Producto principal</h3>
              <p className="mt-1 text-sm font-semibold opacity-75">Detalle corto y fácil de leer.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--space-muted)] px-3 py-1 text-xs font-black">Nuevo</span>
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--space-primary)] px-3 text-xs font-black text-[var(--space-primary-contrast)]">
                  <Sparkles className="size-3.5" />
                  Consultar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <Save className="size-4" />
          Guardar identidad visual
        </button>
        <button
          type="submit"
          name="visualIdentityReset"
          value="1"
          onClick={() => applyPreset(DEFAULT_COMMERCIAL_THEME.preset)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-5 font-black text-brand-dark hover:border-brand"
        >
          <RotateCcw className="size-4" />
          Restaurar colores JAKAWI
        </button>
      </div>
    </form>
  );
}
