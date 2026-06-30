"use client";

import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCroppedImageFile } from "@/components/images/image-crop-utils";
import type { CropAspectPreset, PixelCrop } from "@/components/images/types";
import { cn } from "@/lib/ui";

type ImageCropperDialogProps = {
  open: boolean;
  file: File | null;
  title: string;
  description?: string;
  presets: CropAspectPreset[];
  defaultPresetId: string;
  outputMimeType?: string;
  quality?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const cropError = "No pudimos ajustar esta imagen. Intenta con otra imagen JPG, PNG o WebP.";

export function ImageCropperDialog({
  open,
  file,
  ...props
}: ImageCropperDialogProps) {
  if (!open || !file) return null;

  return <ImageCropperDialogContent key={`${file.name}-${file.size}-${file.lastModified}-${props.defaultPresetId}`} file={file} {...props} />;
}

function ImageCropperDialogContent({
  file,
  title,
  description = "Mueve y acerca la imagen hasta que se vea bien.",
  presets,
  defaultPresetId,
  outputMimeType = "image/jpeg",
  quality = 0.92,
  onCancel,
  onConfirm,
}: Omit<ImageCropperDialogProps, "open" | "file"> & { file: File }) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPresetId);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? presets.find((preset) => preset.id === defaultPresetId) ?? presets[0],
    [defaultPresetId, presets, selectedPresetId],
  );
  const shouldCrop = Boolean(selectedPreset?.aspect);

  useEffect(() => {
    return () => URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCropping) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCropping, onCancel]);

  async function handleConfirm() {
    if (!file) return;

    if (!shouldCrop) {
      onConfirm(file);
      return;
    }

    if (!imageSrc || !pixelCrop || !selectedPreset) {
      setError(cropError);
      return;
    }

    setIsCropping(true);
    setError(null);

    try {
      const croppedFile = await getCroppedImageFile({
        imageSrc,
        pixelCrop,
        fileName: file.name,
        outputMimeType,
        quality,
        outputWidth: selectedPreset.outputWidth,
        outputHeight: selectedPreset.outputHeight,
      });
      onConfirm(croppedFile);
    } catch {
      setError(cropError);
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/55 px-0 py-0 sm:items-center sm:px-4 sm:py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-lg bg-brand-paper shadow-2xl sm:max-w-2xl sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-border px-4 py-3 sm:px-5">
          <div>
            <h2 id="image-cropper-title" className="text-lg font-black text-brand-dark">
              {title}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-neutral-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCropping}
            aria-label="Cerrar"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-brand-border bg-white text-brand-dark transition hover:border-brand disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {presets.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto rounded-md bg-brand-muted p-1">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setError(null);
                  }}
                  className={cn(
                    "h-10 shrink-0 rounded-md px-3 text-sm font-black transition",
                    selectedPreset?.id === preset.id ? "bg-brand text-white shadow-sm" : "text-brand-dark hover:bg-white",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative h-[min(58dvh,430px)] min-h-72 overflow-hidden rounded-md bg-neutral-950">
            {shouldCrop && imageSrc && selectedPreset ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={selectedPreset.aspect ?? 1}
                minZoom={1}
                maxZoom={4}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels: Area) => setPixelCrop(croppedAreaPixels)}
                classes={{
                  containerClassName: "image-cropper-container",
                  cropAreaClassName: "image-cropper-area",
                }}
              />
            ) : (
              <div className="grid h-full place-items-center p-4">
                {imageSrc ? <img src={imageSrc} alt="" className="max-h-full max-w-full rounded-md object-contain" /> : <ImagePlus className="size-8 text-white/60" />}
              </div>
            )}
          </div>

          {shouldCrop ? (
            <label className="block space-y-2">
              <span className="text-sm font-black text-brand-dark">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-10 w-full accent-brand"
              />
            </label>
          ) : (
            <p className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold leading-5 text-neutral-700">Se usará la imagen completa y JAKAWI la optimizará al guardar.</p>
          )}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-brand-border px-4 py-3 sm:flex sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCropping}
            className="h-11 rounded-md border border-brand-border bg-white px-4 text-sm font-black text-brand-dark transition hover:border-brand disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isCropping}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-black text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {isCropping ? <Loader2 className="size-4 animate-spin" /> : null}
            Usar imagen
          </button>
        </div>
      </div>
    </div>
  );
}
