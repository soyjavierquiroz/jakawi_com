"use client";

import { Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/ui";
import type { SellerVoiceNoteConfig } from "@/lib/seller-ai/voice-notes";

type SellerAiVoiceNoteProps = {
  voiceNote: SellerVoiceNoteConfig;
  align?: "assistant" | "seller";
  compact?: boolean;
  onDismiss?: () => void;
  onInteract?: () => void;
};

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat("es", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function waveformHeights(seed: string) {
  const source = seed || "jakawi";
  return Array.from({ length: 22 }, (_, index) => {
    const code = source.charCodeAt(index % source.length) + index * 7;
    return 8 + (code % 20);
  });
}

export function SellerAiVoiceNote({ voiceNote, align = "assistant", compact = false, onDismiss, onInteract }: SellerAiVoiceNoteProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(voiceNote.durationSeconds);
  const [timestamp] = useState(currentTimeLabel);
  const bars = useMemo(() => waveformHeights(`${voiceNote.type}:${voiceNote.transcript}`), [voiceNote.transcript, voiceNote.type]);
  const initials = voiceNote.displayName.trim().slice(0, 1).toUpperCase() || "V";

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }

  function openTranscriptFallback() {
    setIsPlaying(false);
    setIsTranscriptOpen(true);
  }

  async function togglePlayback() {
    onInteract?.();

    if (isPlaying) {
      audioRef.current?.pause();
      stopSpeech();
      setIsPlaying(false);
      return;
    }

    if (voiceNote.audioUrl) {
      try {
        stopSpeech();
        await audioRef.current?.play();
        setIsPlaying(true);
        return;
      } catch {
        openTranscriptFallback();
        return;
      }
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      openTranscriptFallback();
      return;
    }

    try {
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(voiceNote.transcript);
      utterance.lang = "es-BO";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.88;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = openTranscriptFallback;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } catch {
      openTranscriptFallback();
    }
  }

  if (!voiceNote.enabled) return null;

  return (
    <div className={cn("flex", align === "seller" ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[92%] items-end gap-2", align === "seller" && "flex-row-reverse")}>
        <div className="size-9 shrink-0 overflow-hidden rounded-full bg-brand-dark ring-2 ring-white">
          {voiceNote.avatarUrl ? <img src={voiceNote.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-black text-white">{initials}</div>}
        </div>
        <div className={cn("relative rounded-2xl border border-[#D5E8CC] bg-[#DCF8C6] px-3 py-2 text-brand-dark shadow-sm", align === "seller" ? "rounded-br-md" : "rounded-bl-md", compact ? "w-[260px]" : "w-[min(315px,calc(100vw-5.5rem))]")}>
          {onDismiss ? (
            <button type="button" onClick={onDismiss} className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-brand-dark/55 transition hover:bg-white/45 hover:text-brand-dark" aria-label="No mostrar de nuevo">
              <X className="size-3.5" />
            </button>
          ) : null}
          <div className="flex items-center gap-2">
            <button type="button" onClick={togglePlayback} className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-dark text-white transition hover:bg-brand" aria-label={isPlaying ? "Pausar nota de voz" : "Reproducir nota de voz"}>
              {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black leading-4 text-brand-dark">{voiceNote.displayName}</p>
              <div className="mt-0.5 flex h-8 items-center gap-[3px]" aria-hidden="true">
                {bars.map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={cn("w-[3px] rounded-full bg-brand/55 transition", isPlaying && "animate-pulse bg-brand-dark/70")}
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 pl-11 text-[11px] font-bold text-brand-dark/60">
            <span>{formatDuration(durationSeconds)}</span>
            <span>{timestamp}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 pl-11">
            <button
              type="button"
              onClick={() => {
                onInteract?.();
                setIsTranscriptOpen((current) => !current);
              }}
              className="text-[12px] font-black text-brand-dark underline-offset-2 hover:underline"
              aria-expanded={isTranscriptOpen}
            >
              Transcribir
            </button>
          </div>
          {isTranscriptOpen ? <p className="mt-2 rounded-md bg-white/55 px-2 py-1.5 text-[13px] font-semibold leading-5 text-brand-dark">{voiceNote.transcript}</p> : null}
          {voiceNote.audioUrl ? (
            <audio
              ref={audioRef}
              src={voiceNote.audioUrl}
              preload="metadata"
              onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;
                if (Number.isFinite(duration) && duration > 0) setDurationSeconds(Math.round(duration));
              }}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onError={openTranscriptFallback}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
