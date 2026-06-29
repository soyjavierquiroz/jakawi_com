import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { optimizeSellerVoiceAudio } from "@/lib/audio/optimize-audio";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAudioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/wav", "audio/x-wav", "audio/ogg", "application/ogg"]);
const maxImageBytes = 5 * 1024 * 1024;
const maxAudioBytes = 8 * 1024 * 1024;
const audioExtensions = new Set(["mp3", "mp4", "m4a", "webm", "wav", "ogg", "oga"]);
const audioExtensionByMimeType: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
};

export type UploadedObject = {
  url: string;
  key: string;
  mimeType: string;
  size: number;
  durationSeconds?: number;
  optimized?: boolean;
  originalMimeType?: string;
  originalSize?: number;
};

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    });
  }

  return s3Client;
}

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-90);
}

async function putFile(file: File, key: string): Promise<UploadedObject> {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("Almacenamiento S3 no configurado.");

  const bytes = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    url: `${publicUrl}/${bucket}/${key}`,
    key,
    mimeType: file.type,
    size: file.size,
  };
}

async function putBuffer(buffer: Buffer, key: string, mimeType: string): Promise<UploadedObject> {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("Almacenamiento S3 no configurado.");

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    url: `${publicUrl}/${bucket}/${key}`,
    key,
    mimeType,
    size: buffer.byteLength,
  };
}

async function uploadFile(file: File, keyPrefix: string) {
  const key = `${keyPrefix}/${nanoid(10)}-${safeName(file.name || "file")}`;
  return putFile(file, key);
}

function baseMimeType(type: string) {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

function audioExtension(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
  return extension && audioExtensions.has(extension) ? extension : audioExtensionByMimeType[baseMimeType(file.type)];
}

function assertValidAudio(file: File) {
  const extension = audioExtension(file);
  if (!allowedAudioTypes.has(baseMimeType(file.type)) || !extension || !audioExtensions.has(extension)) {
    throw new Error("Solo se permiten audios MP3, M4A, MP4, WebM, WAV u OGG.");
  }
  if (file.size > maxAudioBytes) throw new Error("El audio no puede superar 8MB.");
  return extension;
}

export async function uploadImage(file: File, keyPrefix: string) {
  if (!file || file.size === 0) return null;
  if (!allowedImageTypes.has(file.type)) throw new Error("Solo se permiten imagenes JPG, PNG o WebP.");
  if (file.size > maxImageBytes) throw new Error("La imagen no puede superar 5MB.");

  return (await uploadFile(file, keyPrefix)).url;
}

export async function uploadAudio(file: File, keyPrefix: string) {
  if (!file || file.size === 0) return null;
  assertValidAudio(file);

  return (await uploadFile(file, keyPrefix)).url;
}

export async function uploadSellerVoiceAudio(file: File, storeId: string, type: "intro" | "guidance" | "handoff") {
  if (!file || file.size === 0) return null;
  const optimized = await optimizeSellerVoiceAudio(file);
  const key = `seller-voice/${storeId}/${type}/${Date.now()}-${nanoid(10)}.mp3`;
  const uploaded = await putBuffer(optimized.buffer, key, optimized.mimeType);
  return {
    ...uploaded,
    durationSeconds: optimized.durationSeconds,
    optimized: optimized.optimized,
    originalMimeType: optimized.originalMimeType,
    originalSize: optimized.originalSize,
  };
}

function keyFromOwnedUrl(url: string) {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) return null;

  let parsed: URL;
  let publicOrigin: string;
  try {
    parsed = new URL(url);
    publicOrigin = new URL(publicUrl).origin;
  } catch {
    return null;
  }

  if (parsed.origin !== publicOrigin && parsed.hostname !== "media.jakawi.com") return null;
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  if (pathParts[0] !== bucket) return null;

  const key = pathParts.slice(1).join("/");
  if (!key) return null;
  const isSellerVoiceKey = key.startsWith("seller-voice/") || /^stores\/[^/]+\/seller-voice\//.test(key);
  return isSellerVoiceKey ? key : null;
}

export async function deleteSellerVoiceObjectIfOwned(url?: string | null) {
  const key = url ? keyFromOwnedUrl(url) : null;
  const bucket = process.env.S3_BUCKET;
  if (!key || !bucket) return false;

  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    console.warn("No se pudo eliminar audio seller voice anterior", { key, error });
    return false;
  }
}
