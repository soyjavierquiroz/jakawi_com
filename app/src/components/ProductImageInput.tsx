"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageCropperDialog } from "@/components/images/ImageCropperDialog";
import type { CropAspectPreset } from "@/components/images/types";
import { imageUploadGuidance } from "@/config/image-upload-guidance";

const productImagePresets: CropAspectPreset[] = [
  { id: "square", label: "Cuadrada", aspect: 1, outputWidth: 1200, outputHeight: 1200 },
  { id: "vertical", label: "Vertical 4:5", aspect: 4 / 5, outputWidth: 1200, outputHeight: 1500 },
  { id: "full", label: "Completa", aspect: null },
];

function setInputFile(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

export function ProductImageInput({ currentImageUrl }: { currentImageUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const guidance = imageUploadGuidance.product;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updatePreview(file: File | null) {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    updatePreview(null);
    setPendingFile(null);
  }

  function useCroppedImage(file: File) {
    setInputFile(inputRef.current, file);
    updatePreview(file);
    setPendingFile(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-black text-brand-dark">{guidance.label}</p>
        <p className="mt-1 text-xs font-medium leading-5 text-brand-dark">{guidance.recommendation}</p>
        <p className="text-xs font-semibold leading-5 text-neutral-500">{guidance.helper}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-black text-brand-dark">Imagen actual</p>
          <img src={currentImageUrl ?? "/placeholder-product.svg"} alt="" className="mt-2 aspect-square w-full max-w-52 rounded-md border border-brand-border bg-brand-muted object-cover" />
        </div>
        <div>
          <p className="text-sm font-black text-brand-dark">{previewUrl ? "Nueva imagen seleccionada" : "Cambiar imagen"}</p>
          <div className="mt-2 grid aspect-square w-full max-w-52 place-items-center overflow-hidden rounded-md border border-dashed border-brand-border bg-brand-muted">
            {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="size-8 text-neutral-400" />}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          className="w-full rounded-md border border-brand-border bg-brand-paper px-3 py-2 text-sm"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) setPendingFile(file);
          }}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-black text-brand-dark hover:border-brand"
          >
            <X className="size-4" />
            Cancelar
          </button>
        ) : null}
      </div>
      <p className="text-xs font-semibold leading-5 text-neutral-500">{guidance.technical}</p>
      <ImageCropperDialog
        open={Boolean(pendingFile)}
        file={pendingFile}
        title="Ajustar imagen del producto"
        presets={productImagePresets}
        defaultPresetId="square"
        outputMimeType="image/jpeg"
        onCancel={() => {
          if (inputRef.current) inputRef.current.value = "";
          setPendingFile(null);
        }}
        onConfirm={useCroppedImage}
      />
    </div>
  );
}
