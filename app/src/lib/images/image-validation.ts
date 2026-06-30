const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"]);
const allowedImageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);

export const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
export const IMAGE_INPUT_ERROR = "Sube una imagen JPG, PNG, WebP, AVIF o HEIC de hasta 10MB.";
export const IMAGE_PROCESSING_ERROR = "No pudimos procesar esta imagen. Sube una imagen JPG, PNG o WebP.";

export type ValidatedImageInput = {
  originalMimeType: string;
  extension: string;
  originalSize: number;
};

export function baseMimeType(type: string) {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

function fileExtension(name: string) {
  const cleanName = name.trim().toLowerCase();
  if (!cleanName.includes(".")) return "";
  return cleanName.split(".").pop()?.replace(/[^a-z0-9]/g, "") ?? "";
}

export function validateImageInputFile(file: File): ValidatedImageInput {
  const originalMimeType = baseMimeType(file.type);
  const extension = fileExtension(file.name);

  if (!file || file.size <= 0) throw new Error("Imagen requerida.");
  if (file.size > MAX_IMAGE_INPUT_BYTES) throw new Error("La imagen no puede superar 10MB.");
  if (!allowedImageMimeTypes.has(originalMimeType) || !allowedImageExtensions.has(extension)) {
    throw new Error(IMAGE_INPUT_ERROR);
  }

  return {
    originalMimeType,
    extension,
    originalSize: file.size,
  };
}
