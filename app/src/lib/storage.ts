import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAudioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/wav"]);
const maxImageBytes = 5 * 1024 * 1024;
const maxAudioBytes = 3 * 1024 * 1024;
const audioExtensions = new Set(["mp3", "mp4", "m4a", "webm", "wav"]);

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

async function uploadFile(file: File, keyPrefix: string) {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("Almacenamiento S3 no configurado.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `${keyPrefix}/${nanoid(10)}-${safeName(file.name || "file")}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${publicUrl}/${bucket}/${key}`;
}

export async function uploadImage(file: File, keyPrefix: string) {
  if (!file || file.size === 0) return null;
  if (!allowedImageTypes.has(file.type)) throw new Error("Solo se permiten imagenes JPG, PNG o WebP.");
  if (file.size > maxImageBytes) throw new Error("La imagen no puede superar 5MB.");

  return uploadFile(file, keyPrefix);
}

export async function uploadAudio(file: File, keyPrefix: string) {
  if (!file || file.size === 0) return null;
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
  if (!allowedAudioTypes.has(file.type) || !extension || !audioExtensions.has(extension)) {
    throw new Error("Solo se permiten audios MP3, M4A, MP4, WebM o WAV.");
  }
  if (file.size > maxAudioBytes) throw new Error("El audio no puede superar 3MB.");

  return uploadFile(file, keyPrefix);
}
