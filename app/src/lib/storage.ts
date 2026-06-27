import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

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

export async function uploadImage(file: File, keyPrefix: string) {
  if (!file || file.size === 0) return null;
  if (!allowedTypes.has(file.type)) throw new Error("Solo se permiten imagenes JPG, PNG o WebP.");
  if (file.size > maxBytes) throw new Error("La imagen no puede superar 5MB.");

  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("Almacenamiento S3 no configurado.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `${keyPrefix}/${nanoid(10)}-${safeName(file.name || "image")}`;

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
