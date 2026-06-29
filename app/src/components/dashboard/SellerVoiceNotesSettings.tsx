"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { sellerVoiceNoteDefaults } from "@/config/seller-voice-notes";
import { saveSellerVoiceNotesSettingsAction } from "@/lib/actions";

type NoteKey = "intro" | "guidance" | "handoff";

type SellerVoiceNotesSettingsProps = {
  canEdit: boolean;
  store: {
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
};

const noteMeta = {
  intro: {
    title: "Audio de bienvenida",
    description: "Explica cómo funciona la compra.",
    enabledName: "sellerIntroEnabled",
    audioName: "sellerIntroAudioUrl",
    transcriptName: "sellerIntroTranscript",
    durationName: "sellerIntroDurationSeconds",
    defaultTranscript: sellerVoiceNoteDefaults.intro.transcript,
  },
  guidance: {
    title: "Audio de orientación",
    description: "Refuerza que estamos preparando la consulta.",
    enabledName: "sellerGuidanceEnabled",
    audioName: "sellerGuidanceAudioUrl",
    transcriptName: "sellerGuidanceTranscript",
    durationName: "sellerGuidanceDurationSeconds",
    defaultTranscript: sellerVoiceNoteDefaults.guidance.transcript,
  },
  handoff: {
    title: "Audio de cierre",
    description: "Da confianza antes de pasar a WhatsApp.",
    enabledName: "sellerHandoffEnabled",
    audioName: "sellerHandoffAudioUrl",
    transcriptName: "sellerHandoffTranscript",
    durationName: "sellerHandoffDurationSeconds",
    defaultTranscript: sellerVoiceNoteDefaults.handoff.transcript,
  },
} as const;

function getInitialNotes(store: SellerVoiceNotesSettingsProps["store"]) {
  return {
    intro: {
      audioUrl: store.sellerIntroAudioUrl ?? "",
      durationSeconds: store.sellerIntroDurationSeconds?.toString() ?? "",
    },
    guidance: {
      audioUrl: store.sellerGuidanceAudioUrl ?? "",
      durationSeconds: store.sellerGuidanceDurationSeconds?.toString() ?? "",
    },
    handoff: {
      audioUrl: store.sellerHandoffAudioUrl ?? "",
      durationSeconds: store.sellerHandoffDurationSeconds?.toString() ?? "",
    },
  };
}

function getInitialEnabled(store: SellerVoiceNotesSettingsProps["store"], key: NoteKey) {
  if (key === "intro") return store.sellerIntroEnabled !== false;
  if (key === "guidance") return store.sellerGuidanceEnabled !== false;
  return store.sellerHandoffEnabled !== false;
}

export function SellerVoiceNotesSettings({ canEdit, store }: SellerVoiceNotesSettingsProps) {
  const [avatarUrl, setAvatarUrl] = useState(store.sellerVoiceAvatarUrl ?? "");
  const [notes, setNotes] = useState(getInitialNotes(store));
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadFile(type: NoteKey | "avatar", file?: File) {
    if (!file || !canEdit) return;
    setUploading(type);
    setMessage(null);

    if (type !== "avatar") {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio(objectUrl);
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration)) {
          setNotes((current) => ({
            ...current,
            [type]: { ...current[type], durationSeconds: String(Math.round(audio.duration)) },
          }));
        }
        URL.revokeObjectURL(objectUrl);
      };
    }

    const formData = new FormData();
    formData.set("type", type);
    formData.set("file", file);

    try {
      const response = await fetch("/api/uploads/seller-voice", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as { publicUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.publicUrl) throw new Error(payload?.error ?? "No se pudo subir el archivo.");
      if (type === "avatar") {
        setAvatarUrl(payload.publicUrl);
      } else {
        setNotes((current) => ({
          ...current,
          [type]: { ...current[type], audioUrl: payload.publicUrl },
        }));
      }
      setMessage("Archivo subido. Guarda cambios para aplicarlo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(null);
    }
  }

  function handleUpload(type: NoteKey | "avatar") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      void uploadFile(type, event.target.files?.[0]);
      event.target.value = "";
    };
  }

  return (
    <form action={saveSellerVoiceNotesSettingsAction} className="mt-6 space-y-5 rounded-lg border border-brand-border bg-brand-paper p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Seller AI</p>
          <h2 className="text-2xl font-black">Notas de voz del vendedor</h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600">Audios cortos tipo WhatsApp para generar confianza antes de cerrar la consulta.</p>
        </div>
        {!canEdit ? <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">Disponible en Pro/Premium</span> : null}
      </div>

      {!canEdit ? <p className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold text-neutral-700">Las notas de voz del vendedor están disponibles con Seller AI en Pro/Premium.</p> : null}
      {message ? <p className="rounded-md bg-brand-soft px-3 py-2 text-sm font-bold text-brand-dark">{message}</p> : null}

      <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-60">
        <label className="flex items-center gap-2 text-sm font-black text-brand-dark">
          <input type="checkbox" name="sellerVoiceEnabled" defaultChecked={store.sellerVoiceEnabled !== false} className="size-4 accent-brand" />
          Activar notas de voz Seller AI
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Nombre visible del vendedor</span>
            <input name="sellerVoiceDisplayName" defaultValue={store.sellerVoiceDisplayName ?? ""} placeholder="Ej. Andrea de la tienda" className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Avatar del vendedor</span>
            <input type="hidden" name="sellerVoiceAvatarUrl" value={avatarUrl} />
            <div className="flex items-center gap-3">
              <div className="size-12 overflow-hidden rounded-full bg-brand-dark">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                {uploading === "avatar" ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                Subir avatar
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload("avatar")} className="sr-only" />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(noteMeta) as NoteKey[]).map((key) => {
            const meta = noteMeta[key];
            const note = notes[key];
            return (
              <section key={key} className="rounded-md border border-brand-border bg-brand-muted p-4">
                <label className="flex items-start gap-2">
                  <input type="checkbox" name={meta.enabledName} defaultChecked={getInitialEnabled(store, key)} className="mt-1 size-4 accent-brand" />
                  <span>
                    <span className="block text-sm font-black text-brand-dark">{meta.title}</span>
                    <span className="block text-xs font-semibold leading-5 text-neutral-600">{meta.description}</span>
                  </span>
                </label>
                <input type="hidden" name={meta.audioName} value={note.audioUrl} />
                <label className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                  {uploading === key ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  Subir audio
                  <input type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/webm,audio/wav" onChange={handleUpload(key)} className="sr-only" />
                </label>
                <p className="mt-2 text-xs font-semibold text-neutral-500">Recomendado máximo 15 segundos. Límite 3MB.</p>
                {note.audioUrl ? <audio src={note.audioUrl} controls preload="metadata" className="mt-3 w-full" /> : null}
                <label className="mt-3 block space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">Duración en segundos</span>
                  <input
                    name={meta.durationName}
                    inputMode="numeric"
                    value={note.durationSeconds}
                    onChange={(event) => setNotes((current) => ({ ...current, [key]: { ...current[key], durationSeconds: event.target.value } }))}
                    className="h-10 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
                  />
                </label>
                <label className="mt-3 block space-y-2">
                  <span className="text-sm font-semibold text-neutral-700">Transcripción</span>
                  <textarea name={meta.transcriptName} rows={5} defaultValue={key === "intro" ? store.sellerIntroTranscript ?? meta.defaultTranscript : key === "guidance" ? store.sellerGuidanceTranscript ?? meta.defaultTranscript : store.sellerHandoffTranscript ?? meta.defaultTranscript} className="w-full rounded-md border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand" />
                </label>
              </section>
            );
          })}
        </div>

        <button className="h-11 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">Guardar notas de voz</button>
      </fieldset>
    </form>
  );
}
