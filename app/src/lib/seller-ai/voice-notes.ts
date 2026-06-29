import { sellerVoiceNoteDefaults } from "@/config/seller-voice-notes";

export type SellerVoiceNoteType = "INTRO" | "GUIDANCE" | "HANDOFF";
export type SellerVoiceNoteSource = "STORE" | "JAKAWI_FALLBACK" | "TEXT_FALLBACK";

export type SellerVoiceNoteConfig = {
  type: SellerVoiceNoteType;
  title: string;
  displayName: string;
  avatarUrl: string | null;
  audioUrl: string | null;
  transcript: string;
  durationSeconds: number;
  enabled: boolean;
  source: SellerVoiceNoteSource;
};

type StoreVoiceFields = {
  name?: string | null;
  logoUrl?: string | null;
  sellerVoiceEnabled?: boolean | null;
  sellerVoiceDisplayName?: string | null;
  sellerVoiceAvatarUrl?: string | null;
  sellerIntroAudioUrl?: string | null;
  sellerIntroTranscript?: string | null;
  sellerIntroDurationSeconds?: number | null;
  sellerIntroEnabled?: boolean | null;
  sellerGuidanceAudioUrl?: string | null;
  sellerGuidanceTranscript?: string | null;
  sellerGuidanceDurationSeconds?: number | null;
  sellerGuidanceEnabled?: boolean | null;
  sellerHandoffAudioUrl?: string | null;
  sellerHandoffTranscript?: string | null;
  sellerHandoffDurationSeconds?: number | null;
  sellerHandoffEnabled?: boolean | null;
};

const typeMap = {
  INTRO: {
    key: "intro",
    audioUrl: "sellerIntroAudioUrl",
    transcript: "sellerIntroTranscript",
    durationSeconds: "sellerIntroDurationSeconds",
    enabled: "sellerIntroEnabled",
  },
  GUIDANCE: {
    key: "guidance",
    audioUrl: "sellerGuidanceAudioUrl",
    transcript: "sellerGuidanceTranscript",
    durationSeconds: "sellerGuidanceDurationSeconds",
    enabled: "sellerGuidanceEnabled",
  },
  HANDOFF: {
    key: "handoff",
    audioUrl: "sellerHandoffAudioUrl",
    transcript: "sellerHandoffTranscript",
    durationSeconds: "sellerHandoffDurationSeconds",
    enabled: "sellerHandoffEnabled",
  },
} as const;

function clean(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

export function getSellerVoiceNoteConfig(store: StoreVoiceFields, type: SellerVoiceNoteType): SellerVoiceNoteConfig {
  const displayName = clean(store.sellerVoiceDisplayName) ?? clean(store.name) ?? "Vendedor";
  const avatarUrl = clean(store.sellerVoiceAvatarUrl) ?? clean(store.logoUrl);
  const fields = typeMap[type];
  const fallback = sellerVoiceNoteDefaults[fields.key];

  if (store.sellerVoiceEnabled === false) {
    return {
      type,
      title: fallback.title,
      displayName,
      avatarUrl,
      audioUrl: null,
      transcript: fallback.transcript,
      durationSeconds: fallback.durationSeconds,
      enabled: false,
      source: "TEXT_FALLBACK",
    };
  }

  const typeEnabled = store[fields.enabled] !== false;
  const storeAudioUrl = clean(store[fields.audioUrl] as string | null | undefined);
  const storeTranscript = clean(store[fields.transcript] as string | null | undefined);
  const storeDuration = store[fields.durationSeconds] as number | null | undefined;

  if (typeEnabled && storeAudioUrl && storeTranscript) {
    return {
      type,
      title: fallback.title,
      displayName,
      avatarUrl,
      audioUrl: storeAudioUrl,
      transcript: storeTranscript,
      durationSeconds: storeDuration && storeDuration > 0 ? storeDuration : fallback.durationSeconds,
      enabled: true,
      source: "STORE",
    };
  }

  const fallbackAudioUrl = clean(fallback.audioUrl);
  return {
    type,
    title: fallback.title,
    displayName,
    avatarUrl,
    audioUrl: fallbackAudioUrl,
    transcript: fallback.transcript,
    durationSeconds: fallback.durationSeconds,
    enabled: typeEnabled,
    source: fallbackAudioUrl ? "JAKAWI_FALLBACK" : "TEXT_FALLBACK",
  };
}
