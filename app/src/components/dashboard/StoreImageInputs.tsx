"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageCropperDialog } from "@/components/images/ImageCropperDialog";
import type { CropAspectPreset } from "@/components/images/types";
import { imageUploadGuidance } from "@/config/image-upload-guidance";

const coverPresets: CropAspectPreset[] = [{ id: "cover", label: "Portada", aspect: 16 / 9, outputWidth: 1600, outputHeight: 900 }];
const logoPresets: CropAspectPreset[] = [{ id: "logo", label: "Cuadrada", aspect: 1, outputWidth: 600, outputHeight: 600 }];

type StoreImageType = "cover" | "logo";

type PendingCrop = {
  type: StoreImageType;
  file: File;
};

function setInputFile(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

export function StoreImageInputs({
  currentCoverUrl,
  currentLogoUrl,
}: {
  currentCoverUrl?: string | null;
  currentLogoUrl?: string | null;
}) {
  const coverGuidance = imageUploadGuidance.cover;
  const logoGuidance = imageUploadGuidance.logo;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function setPreview(type: StoreImageType, file: File | null) {
    const setter = type === "cover" ? setCoverPreviewUrl : setLogoPreviewUrl;
    setter((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearImage(type: StoreImageType) {
    const input = type === "cover" ? coverInputRef.current : logoInputRef.current;
    if (input) input.value = "";
    setPreview(type, null);
    if (pendingCrop?.type === type) setPendingCrop(null);
  }

  function handleSelected(type: StoreImageType, file?: File) {
    const input = type === "cover" ? coverInputRef.current : logoInputRef.current;
    if (input) input.value = "";
    if (file) setPendingCrop({ type, file });
  }

  function useCroppedImage(file: File) {
    if (!pendingCrop) return;
    const input = pendingCrop.type === "cover" ? coverInputRef.current : logoInputRef.current;
    setInputFile(input, file);
    setPreview(pendingCrop.type, file);
    setPendingCrop(null);
  }

  const cropConfig =
    pendingCrop?.type === "logo"
      ? {
          title: "Ajustar logo",
          presets: logoPresets,
          defaultPresetId: "logo",
          outputMimeType: "image/png",
        }
      : {
          title: "Ajustar foto de portada",
          presets: coverPresets,
          defaultPresetId: "cover",
          outputMimeType: "image/jpeg",
        };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <span className="block text-sm font-semibold text-neutral-700">{coverGuidance.label}</span>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="aspect-video w-full overflow-hidden rounded-md border border-brand-border bg-brand-muted">
              {coverPreviewUrl || currentCoverUrl ? (
                <img src={coverPreviewUrl ?? currentCoverUrl ?? ""} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  <ImagePlus className="size-8 text-neutral-400" />
                </div>
              )}
            </div>
            {coverPreviewUrl ? (
              <button type="button" onClick={() => clearImage("cover")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-black text-brand-dark hover:border-brand">
                <X className="size-4" />
                Cancelar
              </button>
            ) : null}
          </div>
          <input ref={coverInputRef} name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(event) => handleSelected("cover", event.currentTarget.files?.[0])} className="w-full rounded-md border border-brand-border px-3 py-2 text-sm" />
          <span className="block text-xs font-medium leading-5 text-brand-dark">{coverGuidance.recommendation}</span>
          <span className="block text-xs font-semibold leading-5 text-neutral-500">{coverGuidance.helper}</span>
          <span className="block text-xs font-semibold leading-5 text-neutral-500">{coverGuidance.technical}</span>
          {!currentCoverUrl ? <span className="block text-xs font-black leading-5 text-amber-700">Sube una foto de portada para que el template Showcase luzca mejor.</span> : null}
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-semibold text-neutral-700">{logoGuidance.label}</span>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="aspect-square w-full max-w-44 overflow-hidden rounded-md border border-brand-border bg-brand-muted">
              {logoPreviewUrl || currentLogoUrl ? (
                <img src={logoPreviewUrl ?? currentLogoUrl ?? ""} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  <ImagePlus className="size-8 text-neutral-400" />
                </div>
              )}
            </div>
            {logoPreviewUrl ? (
              <button type="button" onClick={() => clearImage("logo")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-black text-brand-dark hover:border-brand">
                <X className="size-4" />
                Cancelar
              </button>
            ) : null}
          </div>
          <input ref={logoInputRef} name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(event) => handleSelected("logo", event.currentTarget.files?.[0])} className="w-full rounded-md border border-brand-border px-3 py-2 text-sm" />
          <span className="block text-xs font-medium leading-5 text-brand-dark">{logoGuidance.recommendation}</span>
          <span className="block text-xs font-semibold leading-5 text-neutral-500">{logoGuidance.helper}</span>
          <span className="block text-xs font-semibold leading-5 text-neutral-500">{logoGuidance.technical}</span>
        </div>
      </div>

      <ImageCropperDialog
        open={Boolean(pendingCrop)}
        file={pendingCrop?.file ?? null}
        title={cropConfig.title}
        presets={cropConfig.presets}
        defaultPresetId={cropConfig.defaultPresetId}
        outputMimeType={cropConfig.outputMimeType}
        onCancel={() => {
          if (pendingCrop?.type === "cover" && coverInputRef.current) coverInputRef.current.value = "";
          if (pendingCrop?.type === "logo" && logoInputRef.current) logoInputRef.current.value = "";
          setPendingCrop(null);
        }}
        onConfirm={useCroppedImage}
      />
    </>
  );
}
