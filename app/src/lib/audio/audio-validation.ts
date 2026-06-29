export const sellerVoiceMaxInputBytes = 8 * 1024 * 1024;

export const sellerVoiceAllowedExtensions = new Set(["webm", "mp3", "m4a", "mp4", "wav", "ogg", "oga"]);

export const sellerVoiceAllowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "application/ogg",
]);

export function baseMimeType(type?: string | null) {
  return type?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function fileExtension(name?: string | null) {
  const cleanName = name?.toLowerCase().trim() ?? "";
  if (!cleanName.includes(".")) return null;
  const extension = cleanName.split(".").pop() ?? "";
  return sellerVoiceAllowedExtensions.has(extension) ? extension : null;
}

export function validateSellerVoiceAudioInput(file: File) {
  const mimeType = baseMimeType(file.type);
  const extension = fileExtension(file.name);

  if (!extension || !sellerVoiceAllowedMimeTypes.has(mimeType)) {
    throw new Error("Solo se permiten audios MP3, M4A, MP4, WebM, WAV u OGG.");
  }

  if (mimeType === "application/ogg" && extension !== "ogg" && extension !== "oga") {
    throw new Error("Solo se permiten audios MP3, M4A, MP4, WebM, WAV u OGG.");
  }

  if (file.size > sellerVoiceMaxInputBytes) throw new Error("El audio no puede superar 8MB.");

  return {
    extension,
    originalMimeType: mimeType,
    originalSize: file.size,
  };
}
