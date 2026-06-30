import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { optimizeSellerVoiceAudio } from "@/lib/audio/optimize-audio";
import { imageAllowedPrefixes, prepareOptimizedImageUpload, type ImageUploadTarget, type ImageUploadType } from "@/lib/images/image-storage";

const allowedAudioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/wav", "audio/x-wav", "audio/ogg", "application/ogg"]);
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
  width?: number;
  height?: number;
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

export async function uploadOptimizedImage(file: File, target: ImageUploadTarget) {
  const optimized = await prepareOptimizedImageUpload(file, target);
  if (!optimized) return null;

  const uploaded = await putBuffer(optimized.buffer, optimized.key, optimized.mimeType);
  return {
    ...uploaded,
    width: optimized.width,
    height: optimized.height,
    optimized: optimized.optimized,
    originalMimeType: optimized.originalMimeType,
    originalSize: optimized.originalSize,
  };
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
  let publicBase: URL;
  try {
    parsed = new URL(url);
    publicBase = new URL(publicUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== publicBase.origin && parsed.hostname !== "media.jakawi.com") return null;
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const publicPathParts = publicBase.pathname.split("/").filter(Boolean);

  let keyParts: string[];
  if (pathParts[0] === bucket) {
    keyParts = pathParts.slice(1);
  } else if (publicPathParts.length > 0 && publicPathParts.every((part, index) => pathParts[index] === part)) {
    keyParts = pathParts.slice(publicPathParts.length);
  } else {
    return null;
  }

  const key = keyParts.join("/");
  if (!key) return null;
  const isSellerVoiceKey = key.startsWith("seller-voice/") || /^stores\/[^/]+\/seller-voice\//.test(key);
  return isSellerVoiceKey ? key : null;
}

function keyFromJakawiMediaUrl(url: string) {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) return null;

  let parsed: URL;
  let publicBase: URL;
  try {
    parsed = new URL(url);
    publicBase = new URL(publicUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== publicBase.origin && parsed.hostname !== "media.jakawi.com") return null;
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const publicPathParts = publicBase.pathname.split("/").filter(Boolean);
  let keyParts: string[];

  if (pathParts[0] === bucket) {
    keyParts = pathParts.slice(1);
  } else if (publicPathParts.length > 0 && publicPathParts.every((part, index) => pathParts[index] === part)) {
    keyParts = pathParts.slice(publicPathParts.length);
  } else {
    return null;
  }

  const key = keyParts.join("/");
  if (!key) return null;

  const blockedGlobalPrefixes = ["assets/", "defaults/", "fallback/", "global/", "placeholders/", "templates/"];
  if (blockedGlobalPrefixes.some((prefix) => key.startsWith(prefix)) || key.includes("placeholder")) return null;

  return key;
}

export function isJakawiMediaUrl(url?: string | null) {
  return Boolean(url && keyFromJakawiMediaUrl(url));
}

function hasAllowedPrefix(key: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some((prefix) => {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
    return key === cleanPrefix || key.startsWith(`${cleanPrefix}/`);
  });
}

export function isJakawiMediaUrlOwnedByStore(
  url: string | null | undefined,
  options: {
    storeId: string;
    allowedPrefixes: string[];
  },
) {
  if (!url || !options.storeId) return false;
  const key = keyFromJakawiMediaUrl(url);
  if (!key) return false;
  return key.split("/").includes(options.storeId) && hasAllowedPrefix(key, options.allowedPrefixes);
}

export async function deleteJakawiMediaObjectIfOwned(
  oldUrl?: string | null,
  options?: {
    storeId: string;
    allowedPrefixes: string[];
    newUrl?: string | null;
  },
) {
  const bucket = process.env.S3_BUCKET;
  if (!oldUrl || !options?.storeId || oldUrl === options.newUrl || !bucket) return false;

  const key = keyFromJakawiMediaUrl(oldUrl);
  if (!key || !isJakawiMediaUrlOwnedByStore(oldUrl, options)) return false;

  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    console.warn("No se pudo eliminar imagen anterior", { key, error });
    return false;
  }
}

export function allowedImageDeletePrefixes(storeId: string, type: ImageUploadType) {
  return imageAllowedPrefixes(storeId, type);
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
