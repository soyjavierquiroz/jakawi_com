export type CommercialThemePresetKey = keyof typeof COMMERCIAL_THEME_PRESETS;

export const DEFAULT_COMMERCIAL_THEME = {
  preset: "JAKAWI",
  primary: "#128C4A",
  background: "#FAF7EF",
  accent: "#A3E635",
} as const;

export const COMMERCIAL_THEME_PRESETS = {
  JAKAWI: {
    name: "JAKAWI",
    primary: "#128C4A",
    background: "#FAF7EF",
    accent: "#A3E635",
  },
  Minimal: {
    name: "Minimal",
    primary: "#111827",
    background: "#F8FAFC",
    accent: "#38BDF8",
  },
  Boutique: {
    name: "Boutique",
    primary: "#8B5E3C",
    background: "#FFF8F1",
    accent: "#E9C46A",
  },
  Premium: {
    name: "Premium",
    primary: "#052E24",
    background: "#F7F3EA",
    accent: "#FACC15",
  },
  Natural: {
    name: "Natural",
    primary: "#2F5D50",
    background: "#F4F1E8",
    accent: "#B7A77A",
  },
  Energia: {
    name: "Energía",
    primary: "#C2410C",
    background: "#FFF7ED",
    accent: "#FACC15",
  },
  Rosa: {
    name: "Rosa",
    primary: "#BE5A83",
    background: "#FFF1F5",
    accent: "#F9A8D4",
  },
} as const;

export type CommercialSpaceTheme = {
  preset: string;
  primary: string;
  primaryContrast: string;
  background: string;
  backgroundContrast: string;
  accent: string;
  accentContrast: string;
  surface: string;
  surfaceContrast: string;
  border: string;
  muted: string;
};

type StoreVisualIdentity = {
  themeColor?: string | null;
  brandPrimaryColor?: string | null;
  brandBackgroundColor?: string | null;
  brandAccentColor?: string | null;
  brandThemePreset?: string | null;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

export function isValidHexColor(value: unknown) {
  if (typeof value !== "string") return false;
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function normalizeHexColor(value: unknown, fallback: string) {
  const fallbackColor = isValidHexColor(fallback) ? fallback : DEFAULT_COMMERCIAL_THEME.primary;
  if (!isValidHexColor(value)) return normalizeHexColor(fallbackColor, DEFAULT_COMMERCIAL_THEME.primary);

  const raw = String(value).trim().replace(/^#/, "");
  const expanded = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  return `#${expanded.toUpperCase()}`;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHexColor(hex, DEFAULT_COMMERCIAL_THEME.primary).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getReadableTextColor(hex: string) {
  return relativeLuminance(normalizeHexColor(hex, DEFAULT_COMMERCIAL_THEME.primary)) > 0.48 ? "#111111" : "#FFFFFF";
}

export function mixColors(fromHex: string, toHex: string, amount = 0.5) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const weight = Math.max(0, Math.min(1, amount));

  return rgbToHex({
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  });
}

export function lighten(hex: string, amount = 0.12) {
  return mixColors(hex, "#FFFFFF", amount);
}

export function darken(hex: string, amount = 0.12) {
  return mixColors(hex, "#000000", amount);
}

function getPresetKey(value?: string | null): CommercialThemePresetKey {
  if (value && value in COMMERCIAL_THEME_PRESETS) return value as CommercialThemePresetKey;
  return DEFAULT_COMMERCIAL_THEME.preset;
}

export function buildCommercialSpaceTheme(store?: StoreVisualIdentity | null): CommercialSpaceTheme {
  const presetKey = getPresetKey(store?.brandThemePreset);
  const preset = COMMERCIAL_THEME_PRESETS[presetKey];
  const primary = normalizeHexColor(store?.brandPrimaryColor ?? store?.themeColor, preset.primary);
  const background = normalizeHexColor(store?.brandBackgroundColor, preset.background);
  const accent = normalizeHexColor(store?.brandAccentColor, preset.accent);
  const backgroundIsDark = getReadableTextColor(background) === "#FFFFFF";
  const surface = backgroundIsDark ? lighten(background, 0.12) : mixColors(background, "#FFFFFF", 0.72);
  const border = backgroundIsDark ? lighten(background, 0.28) : darken(background, 0.12);
  const muted = backgroundIsDark ? lighten(background, 0.18) : mixColors(background, primary, 0.06);

  return {
    preset: presetKey,
    primary,
    primaryContrast: getReadableTextColor(primary),
    background,
    backgroundContrast: getReadableTextColor(background),
    accent,
    accentContrast: getReadableTextColor(accent),
    surface,
    surfaceContrast: getReadableTextColor(surface),
    border,
    muted,
  };
}

export function commercialThemeToCssVariables(theme: CommercialSpaceTheme) {
  return {
    "--space-primary": theme.primary,
    "--space-primary-contrast": theme.primaryContrast,
    "--space-background": theme.background,
    "--space-background-contrast": theme.backgroundContrast,
    "--space-accent": theme.accent,
    "--space-accent-contrast": theme.accentContrast,
    "--space-surface": theme.surface,
    "--space-surface-contrast": theme.surfaceContrast,
    "--space-border": theme.border,
    "--space-muted": theme.muted,
  };
}
