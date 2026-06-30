"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ProductImageInput({ currentImageUrl }: { currentImageUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-3">
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
          accept="image/jpeg,image/png,image/webp"
          className="w-full rounded-md border border-brand-border bg-brand-paper px-3 py-2 text-sm"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPreviewUrl((current) => {
              if (current) URL.revokeObjectURL(current);
              return file ? URL.createObjectURL(file) : null;
            });
          }}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              setPreviewUrl((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
              });
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-black text-brand-dark hover:border-brand"
          >
            <X className="size-4" />
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
