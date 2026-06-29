"use client";

import { Loader2, Mic, RotateCcw, Square, Trash2, UploadCloud } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { SellerAiVoiceNote } from "@/components/seller-ai/SellerAiVoiceNote";
import { sellerVoiceNoteDefaults } from "@/config/seller-voice-notes";
import { saveSellerVoiceNotesSettingsAction } from "@/lib/actions";
import type { SellerVoiceNoteConfig, SellerVoiceNoteSource, SellerVoiceNoteType } from "@/lib/seller-ai/voice-notes";

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
    },
    guidance: {
      audioUrl: store.sellerGuidanceAudioUrl ?? "",
      durationSeconds: store.sellerGuidanceDurationSeconds?.toString() ?? "",
      deleteAudio: false,
    },
    handoff: {
      audioUrl: store.sellerHandoffAudioUrl ?? "",
      durationSeconds: store.sellerHandoffDurationSeconds?.toString() ?? "",
      deleteAudio: false,
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

function sourceLabel(source: SellerVoiceNoteSource) {
  if (source === "STORE") return "Audio personalizado";
  if (source === "JAKAWI_FALLBACK") return "Fallback JAKAWI";
  return "Solo transcripción";
}

export function SellerVoiceNotesSettings({ canEdit, store }: SellerVoiceNotesSettingsProps) {
  const [avatarUrl, setAvatarUrl] = useState(store.sellerVoiceAvatarUrl ?? "");
  const [displayName, setDisplayName] = useState(store.sellerVoiceDisplayName ?? "");
  const [notes, setNotes] = useState(getInitialNotes(store));
  const [transcripts, setTranscripts] = useState(getInitialTranscripts(store));
  const [uploading, setUploading] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<NoteKey | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
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
      const payload = (await response.json().catch(() => null)) as { url?: string; publicUrl?: string; error?: string } | null;
      const uploadedUrl = payload?.url ?? payload?.publicUrl;
      if (!response.ok || !uploadedUrl) throw new Error(payload?.error ?? "No se pudo subir el archivo.");
      if (type === "avatar") {
        setAvatarUrl(uploadedUrl);
      } else {
        setNotes((current) => ({
          ...current,
          [type]: { ...current[type], audioUrl: uploadedUrl, deleteAudio: false },
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
    setNotes((current) => ({ ...current, [type]: { audioUrl: "", durationSeconds: "", deleteAudio: true } }));
    setMessage("Audio eliminado de esta nota. Guarda cambios para aplicarlo.");
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
            <input name="sellerVoiceDisplayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ej. Andrea de la tienda" className="h-11 w-full rounded-md border border-brand-border px-3 outline-none focus:border-brand" />
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
            const fallback = sellerVoiceNoteDefaults[key];
            const previewSource: SellerVoiceNoteSource = note.audioUrl ? "STORE" : fallback.audioUrl ? "JAKAWI_FALLBACK" : "TEXT_FALLBACK";
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
                    <span className="block text-xs font-semibold leading-5 text-neutral-600">{meta.description}</span>
                  </span>
                </label>
                <input type="hidden" name={meta.audioName} value={note.deleteAudio ? "__DELETE__" : note.audioUrl} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-brand-dark transition hover:border-brand">
                    {uploading === key ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                    {note.audioUrl ? "Reemplazar" : "Subir audio"}
                    <input type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/webm,audio/wav" onChange={handleUpload(key)} className="sr-only" />
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
                    <button type="button" onClick={() => removeAudio(key)} className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-black text-red-700 transition hover:border-red-300">
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-500">Recomendado máximo 15 segundos. Límite 3MB.</p>
                <div className="mt-3 rounded-md bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase text-neutral-500">Preview real</p>
                    <span className="rounded-full bg-brand-muted px-2 py-1 text-[11px] font-black text-brand-dark">{sourceLabel(previewSource)}</span>
                  </div>
                  <SellerAiVoiceNote voiceNote={previewVoiceNote} compact playLabel="Reproducir preview" />
                </div>
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
                  <textarea
                    name={meta.transcriptName}
                    rows={5}
                    value={transcripts[key]}
                    onChange={(event) => setTranscripts((current) => ({ ...current, [key]: event.target.value }))}
                    className="w-full rounded-md border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
                <div className="mt-3 rounded-md bg-white/75 p-3">
                  <p className="text-xs font-black uppercase text-neutral-500">Guion sugerido</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-neutral-600">{meta.defaultTranscript}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-500">La transcripción aparece si el cliente toca “Transcribir”.</p>
              </section>
            );
          })}
        </div>

        <button className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 font-bold text-white hover:bg-brand-dark">
          <RotateCcw className="size-4" />
          Guardar notas de voz
        </button>
      </fieldset>
    </form>
  );
}
