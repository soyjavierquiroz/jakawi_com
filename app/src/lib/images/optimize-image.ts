import sharp, { type FitEnum } from "sharp";
import { IMAGE_PROCESSING_ERROR } from "@/lib/images/image-validation";

export type ImageResizeFit = keyof FitEnum;

export type OptimizeImageOptions = {
  width: number;
  height: number;
  fit: ImageResizeFit;
  quality?: number;
  originalMimeType?: string;
  originalSize?: number;
};

export type OptimizedImage = {
  buffer: Buffer;
  mimeType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
  size: number;
  originalSize: number;
  originalMimeType: string;
  optimized: true;
};

export async function optimizeImage(inputBuffer: Buffer, options: OptimizeImageOptions): Promise<OptimizedImage> {
  try {
    const image = sharp(inputBuffer, { animated: false, failOn: "error", limitInputPixels: 50_000_000 });
    const buffer = await image
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: options.quality ?? 82 })
      .toBuffer();

    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      mimeType: "image/webp",
      extension: "webp",
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: buffer.byteLength,
      originalSize: options.originalSize ?? inputBuffer.byteLength,
      originalMimeType: options.originalMimeType ?? "application/octet-stream",
      optimized: true,
    };
  } catch {
    throw new Error(IMAGE_PROCESSING_ERROR);
  }
}
