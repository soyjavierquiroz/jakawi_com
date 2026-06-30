"use client";

import { Loader2, Mic, RotateCcw, Square, Trash2, UploadCloud } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ImageCropperDialog } from "@/components/images/ImageCropperDialog";
import type { CropAspectPreset } from "@/components/images/types";
import { SellerAiVoiceNote } from "@/components/seller-ai/SellerAiVoiceNote";
import { imageUploadGuidance } from "@/config/image-upload-guidance";
import { sellerVoiceNoteDefaults } from "@/config/seller-voice-notes";
import { saveSellerVoiceNotesSettingsAction } from "@/lib/actions";
import type { SellerVoiceNoteConfig, SellerVoiceNoteSource, SellerVoiceNoteType } from "@/lib/seller-ai/voice-notes";

type NoteKey = "intro" | "guidance" | "handoff";

const sellerAvatarPresets: CropAspectPreset[] = [{ id: "avatar", label: "Cuadrada", aspect: 1, outputWidth: 600, outputHeight: 600 }];

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
    description: "Aparece cuando el cliente abre Seller AI.",
    enabledName: "sellerIntroEnabled",
    audioName: "sellerIntroAudioUrl",
    transcriptName: "sellerIntroTranscript",
    durationName: "sellerIntroDurationSeconds",
    type: "INTRO",
    defaultTranscript: sellerVoiceNoteDefaults.intro.transcript,
  },
  guidance: {
    title: "Audio de orientación",
    description: "Aparece cuando el cliente ya dio contexto y estamos preparando la consulta.",
    enabledName: "sellerGuidanceEnabled",
    audioName: "sellerGuidanceAudioUrl",
    transcriptName: "sellerGuidanceTranscript",
    durationName: "sellerGuidanceDurationSeconds",
    type: "GUIDANCE",
    defaultTranscript: sellerVoiceNoteDefaults.guidance.transcript,
  },
  handoff: {
    title: "Audio de cierre",
    description: "Aparece antes de pasar a WhatsApp.",
    enabledName: "sellerHandoffEnabled",
    audioName: "sellerHandoffAudioUrl",
    transcriptName: "sellerHandoffTranscript",
    durationName: "sellerHandoffDurationSeconds",
    type: "HANDOFF",
    defaultTranscript: sellerVoiceNoteDefaults.handoff.transcript,
  },
} as const;

function getInitialNotes(store: SellerVoiceNotesSettingsProps["store"]) {
  return {
    intro: {
      audioUrl: store.sellerIntroAudioUrl ?? "",
      durationSeconds: store.sellerIntroDurationSeconds?.toString() ?? "",
      deleteAudio: false,
      optimized: Boolean(store.sellerIntroAudioUrl?.endsWith(".mp3")),
      sizeBytes: null as number | null,
    },
    guidance: {
      audioUrl: store.sellerGuidanceAudioUrl ?? "",
      durationSeconds: store.sellerGuidanceDurationSeconds?.toString() ?? "",
      deleteAudio: false,
      optimized: Boolean(store.sellerGuidanceAudioUrl?.endsWith(".mp3")),
      sizeBytes: null as number | null,
    },
    handoff: {
      audioUrl: store.sellerHandoffAudioUrl ?? "",
      durationSeconds: store.sellerHandoffDurationSeconds?.toString() ?? "",
      deleteAudio: false,
      optimized: Boolean(store.sellerHandoffAudioUrl?.endsWith(".mp3")),
      sizeBytes: null as number | null,
    },
  };
}

function getInitialEnabled(store: SellerVoiceNotesSettingsProps["store"], key: NoteKey) {
  if (key === "intro") return store.sellerIntroEnabled !== false;
  if (key === "guidance") return store.sellerGuidanceEnabled !== false;
  return store.sellerHandoffEnabled !== false;
}

function getInitialTranscripts(store: SellerVoiceNotesSettingsProps["store"]) {
  return {
    intro: store.sellerIntroTranscript ?? noteMeta.intro.defaultTranscript,
    guidance: store.sellerGuidanceTranscript ?? noteMeta.guidance.defaultTranscript,
    handoff: store.sellerHandoffTranscript ?? noteMeta.handoff.defaultTranscript,
  };
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(source: SellerVoiceNoteSource, optimized?: boolean) {
  if (source === "STORE") return optimized ? "Audio personalizado · MP3 optimizado" : "Audio personalizado";
  if (source === "JAKAWI_FALLBACK") return "Fallback JAKAWI";
  return "Solo transcripción";
}

export function SellerVoiceNotesSettings({ canEdit, store }: SellerVoiceNotesSettingsProps) {
  const avatarGuidance = imageUploadGuidance.sellerAvatar;
  const [avatarUrl, setAvatarUrl] = useState(store.sellerVoiceAvatarUrl ?? "");
  const [displayName, setDisplayName] = useState(store.sellerVoiceDisplayName ?? "");
  const [notes, setNotes] = useState(getInitialNotes(store));
  const [transcripts, setTranscripts] = useState(getInitialTranscripts(store));
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<NoteKey | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const stopTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
  }, []);

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
      const payload = (await response.json().catch(() => null)) as { url?: string; publicUrl?: string; error?: string; durationSeconds?: number; optimized?: boolean; size?: number } | null;
      const uploadedUrl = payload?.url ?? payload?.publicUrl;
      if (!response.ok || !uploadedUrl) throw new Error(payload?.error ?? "No se pudo subir el archivo.");
      if (type === "avatar") {
        setAvatarUrl(uploadedUrl);
      } else {
        setNotes((current) => ({
          ...current,
          [type]: {
            ...current[type],
            audioUrl: uploadedUrl,
            durationSeconds: payload?.durationSeconds ? String(payload.durationSeconds) : current[type].durationSeconds,
            deleteAudio: false,
            optimized: payload?.optimized === true || uploadedUrl.endsWith(".mp3"),
            sizeBytes: typeof payload?.size === "number" ? payload.size : null,
          },
        }));
      }
      setIsDirty(true);
      setMessage("Archivo optimizado automáticamente para carga rápida. Guarda cambios para aplicarlo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(null);
    }
  }

  function handleUpload(type: NoteKey | "avatar") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (type === "avatar") {
        if (file) setPendingAvatarFile(file);
      } else {
        void uploadFile(type, file);
      }
      event.target.value = "";
    };
  }

  async function startRecording(type: NoteKey) {
    if (!canEdit) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Tu navegador no permite grabar audio aquí. Puedes subir un archivo.");
      return;
    }

    try {
      setMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorderOptions = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      // eslint-disable-next-line react-hooks/purity
      startedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecordingKey(type);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `${type}-seller-voice.webm`, { type: blob.type || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecordingKey(null);
        setRecordingSeconds(0);
        if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
        setNotes((current) => ({ ...current, [type]: { ...current[type], durationSeconds: String(Math.min(seconds, 15)) } }));
        void uploadFile(type, file);
      };

      recorder.start();
      tickTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.min(15, Math.round((Date.now() - startedAtRef.current) / 1000)));
      }, 250);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 15000);
    } catch {
      setRecordingKey(null);
      setMessage("No pudimos acceder al micrófono. Revisa permisos o sube un archivo.");
    }
  }

  function stopRecording() {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function removeAudio(type: NoteKey) {
    setNotes((current) => ({ ...current, [type]: { audioUrl: "", durationSeconds: "", deleteAudio: true, optimized: false, sizeBytes: null } }));
    setIsDirty(true);
    setMessage("Audio eliminado de esta nota. Guarda cambios para aplicarlo.");
  }

  return (
    <form action={saveSellerVoiceNotesSettingsAction} onSubmit={() => setIsDirty(false)} className="space-y-5 rounded-lg border border-brand-border bg-brand-paper p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-dark">Seller AI</p>
          <h2 className="text-xl font-black md:text-2xl">Notas de voz del vendedor</h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600">Audios cortos tipo WhatsApp para generar confianza antes de cerrar la consulta.</p>
        </div>
        {!canEdit ? <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">Disponible en Pro/Premium</span> : null}
      </div>

      {!canEdit ? <p className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold text-neutral-700">Las notas de voz del vendedor están disponibles con Seller AI en Pro/Premium.</p> : null}
      {message ? <p className="rounded-md bg-brand-soft px-3 py-2 text-sm font-bold text-brand-dark">{message}</p> : null}

      <fieldset disabled={!canEdit} onChange={() => setIsDirty(true)} className="space-y-5 disabled:opacity-60">
        <label className="flex items-center gap-2 text-sm font-black text-brand-dark">
          <input type="checkbox" name="sellerVoiceEnabled" defaultChecked={store.sellerVoiceEnabled !== false} className="size-4 accent-brand" />
          Activar notas de voz Seller AI
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">Nombre visible del vendedor</span>
            <input
              name="sellerVoiceDisplayName"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setIsDirty(true);
              }}
              placeholder="Ej. Andrea de la tienda"
              className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-700">{avatarGuidance.label}</span>
            <input type="hidden" name="sellerVoiceAvatarUrl" value={avatarUrl} />
            <div className="flex items-center gap-3">
              <div className="size-12 overflow-hidden rounded-full bg-brand-dark">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                {uploading === "avatar" ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                Subir avatar
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={handleUpload("avatar")} className="sr-only" />
              </label>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium leading-5 text-brand-dark">{avatarGuidance.recommendation}</p>
              <p className="text-xs font-semibold leading-5 text-neutral-500">{avatarGuidance.helper}</p>
              <p className="text-xs font-semibold leading-5 text-neutral-500">{avatarGuidance.technical}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
          {(Object.keys(noteMeta) as NoteKey[]).map((key) => {
            const meta = noteMeta[key];
            const note = notes[key];
            const fallback = sellerVoiceNoteDefaults[key];
            const previewSource: SellerVoiceNoteSource = note.audioUrl ? "STORE" : fallback.audioUrl ? "JAKAWI_FALLBACK" : "TEXT_FALLBACK";
            const optimizedLabel = note.optimized || note.audioUrl.endsWith(".mp3");
            const optimizedSize = formatBytes(note.sizeBytes);
            const enabled = getInitialEnabled(store, key);
            const durationLabel = `${Number.parseInt(note.durationSeconds, 10) || fallback.durationSeconds}s`;
            const previewVoiceNote: SellerVoiceNoteConfig = {
              type: meta.type as SellerVoiceNoteType,
              title: fallback.title,
              displayName: displayName.trim() || store.sellerVoiceDisplayName || "Vendedor",
              avatarUrl: avatarUrl || null,
              audioUrl: note.audioUrl || fallback.audioUrl || null,
              transcript: transcripts[key] || fallback.transcript,
              durationSeconds: Number.parseInt(note.durationSeconds, 10) || fallback.durationSeconds,
              enabled: true,
              source: previewSource,
            };
            return (
              <section key={key} className="rounded-md border border-brand-border bg-brand-muted p-4">
                <label className="flex items-start gap-2">
                  <input type="checkbox" name={meta.enabledName} defaultChecked={getInitialEnabled(store, key)} className="mt-1 size-4 accent-brand" />
                  <span>
                    <span className="block text-sm font-black text-brand-dark">{meta.title}</span>
                    <span className="mt-0.5 block text-xs font-black leading-5 text-neutral-500">
                      {enabled ? "Activo" : "Inactivo"} · {sourceLabel(previewSource, optimizedLabel)} · {durationLabel}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-neutral-600">{meta.description}</span>
                  </span>
                </label>
                <input type="hidden" name={meta.audioName} value={note.deleteAudio ? "__DELETE__" : note.audioUrl} />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                    {uploading === key ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                    {note.audioUrl ? "Cambiar" : "Subir audio"}
                    <input type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/webm,audio/wav,audio/x-wav,audio/ogg,application/ogg,.oga,.ogg" onChange={handleUpload(key)} className="sr-only" />
                  </label>
                  {recordingKey === key ? (
                    <button type="button" onClick={stopRecording} className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-black text-white transition hover:bg-red-700">
                      <Square className="size-4" />
                      Detener {recordingSeconds}s
                    </button>
                  ) : (
                    <button type="button" onClick={() => void startRecording(key)} disabled={Boolean(recordingKey) || uploading === key} className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand disabled:opacity-50">
                      <Mic className="size-4" />
                      Grabar
                    </button>
                  )}
                  {note.audioUrl ? (
                    <button type="button" onClick={() => removeAudio(key)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-red-700 transition hover:border-red-300">
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-500">Recomendado máximo 15 segundos. Puedes subir hasta 8MB; JAKAWI lo optimiza a MP3.</p>
                {note.audioUrl && optimizedLabel ? <p className="mt-1 text-xs font-black text-brand-dark">Archivo optimizado para carga rápida{optimizedSize ? ` · ${optimizedSize}` : ""}</p> : null}
                <div className="mt-3 rounded-md bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase text-neutral-500">Preview real</p>
                    <span className="rounded-full bg-brand-muted px-2 py-1 text-[11px] font-black text-brand-dark">{sourceLabel(previewSource, optimizedLabel)}</span>
                  </div>
                  <SellerAiVoiceNote voiceNote={previewVoiceNote} compact playLabel="Reproducir preview" />
                </div>
                <details className="group mt-3 rounded-md bg-white">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-black text-brand-dark">
                    Editar transcripción
                    <span className="text-lg leading-none group-open:rotate-45">+</span>
                  </summary>
                  <div className="space-y-3 px-3 pb-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-neutral-700">Duración en segundos</span>
                      <input
                        name={meta.durationName}
                        inputMode="numeric"
                        value={note.durationSeconds}
                        onChange={(event) => {
                          setNotes((current) => ({ ...current, [key]: { ...current[key], durationSeconds: event.target.value } }));
                          setIsDirty(true);
                        }}
                        className="h-10 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-neutral-700">Transcripción</span>
                      <textarea
                        name={meta.transcriptName}
                        rows={4}
                        value={transcripts[key]}
                        onChange={(event) => {
                          setTranscripts((current) => ({ ...current, [key]: event.target.value }));
                          setIsDirty(true);
                        }}
                        className="w-full rounded-md border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    </label>
                  </div>
                </details>
                <details className="group mt-2 rounded-md bg-white/75">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-black uppercase text-neutral-500">
                    Guion sugerido
                    <span className="text-base leading-none text-brand-dark group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-3 pb-3 text-xs font-semibold leading-5 text-neutral-600">{meta.defaultTranscript}</p>
                </details>
                <p className="mt-2 text-xs font-semibold text-neutral-500">La transcripción aparece si el cliente toca “Transcribir”.</p>
              </section>
            );
          })}
        </div>

        <button className="hidden h-11 items-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark md:inline-flex">
          <RotateCcw className="size-4" />
          Guardar notas de voz
        </button>
        {isDirty ? (
          <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 rounded-lg border border-brand-border bg-brand-paper p-3 shadow-2xl md:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-brand-dark">Cambios sin guardar</p>
              <button className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-black text-white hover:bg-brand-dark">
                <RotateCcw className="size-4" />
                Guardar cambios
              </button>
            </div>
          </div>
        ) : null}
      </fieldset>
      <ImageCropperDialog
        open={Boolean(pendingAvatarFile)}
        file={pendingAvatarFile}
        title="Ajustar avatar"
        presets={sellerAvatarPresets}
        defaultPresetId="avatar"
        outputMimeType="image/png"
        onCancel={() => setPendingAvatarFile(null)}
        onConfirm={(file) => {
          setPendingAvatarFile(null);
          void uploadFile("avatar", file);
        }}
      />
    </form>
  );
}
