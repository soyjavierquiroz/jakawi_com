import type { PixelCrop } from "@/components/images/types";

type GetCroppedImageFileOptions = {
  imageSrc: string;
  pixelCrop: PixelCrop;
  fileName: string;
  outputMimeType?: string;
  quality?: number;
  outputWidth?: number;
  outputHeight?: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No pudimos leer la imagen."));
    image.src = src;
  });
}

function croppedFileName(fileName: string, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const cleanName = fileName.replace(/\.[^.]+$/, "");
  return `${cleanName || "imagen"}-cropped.${extension}`;
}

export async function getCroppedImageFile({
  imageSrc,
  pixelCrop,
  fileName,
  outputMimeType = "image/jpeg",
  quality = 0.92,
  outputWidth,
  outputHeight,
}: GetCroppedImageFileOptions) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const targetWidth = Math.max(1, Math.round(outputWidth ?? pixelCrop.width));
  const targetHeight = Math.max(1, Math.round(outputHeight ?? pixelCrop.height));
  const context = canvas.getContext("2d");

  if (!context) throw new Error("No pudimos ajustar esta imagen.");

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputMimeType, quality);
  });

  if (!blob) throw new Error("No pudimos ajustar esta imagen.");

  return new File([blob], croppedFileName(fileName, outputMimeType), {
    type: outputMimeType,
    lastModified: Date.now(),
  });
}
