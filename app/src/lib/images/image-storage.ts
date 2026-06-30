import { nanoid } from "nanoid";
import { optimizeImage, type ImageResizeFit, type OptimizedImage } from "@/lib/images/optimize-image";
import { validateImageInputFile } from "@/lib/images/image-validation";

export type ImageUploadType = "PRODUCT_IMAGE" | "STORE_COVER" | "STORE_LOGO" | "SELLER_AVATAR" | "CATEGORY_IMAGE";

export type ImageUploadTarget = {
  type: ImageUploadType;
  storeId: string;
  entityId?: string | null;
};

export type OptimizedImageUpload = OptimizedImage & {
  key: string;
};

const imageProfiles: Record<ImageUploadType, { width: number; height: number; fit: ImageResizeFit }> = {
  PRODUCT_IMAGE: { width: 1200, height: 1200, fit: "inside" },
  STORE_COVER: { width: 1600, height: 900, fit: "inside" },
  STORE_LOGO: { width: 512, height: 512, fit: "inside" },
  SELLER_AVATAR: { width: 512, height: 512, fit: "inside" },
  CATEGORY_IMAGE: { width: 800, height: 800, fit: "inside" },
};

function imageKey(target: ImageUploadTarget) {
  const suffix = `${Date.now()}-${nanoid(10)}.webp`;

  if (target.type === "PRODUCT_IMAGE") {
    return target.entityId ? `products/${target.storeId}/${target.entityId}/main-${suffix}` : `products/${target.storeId}/pending/main-${suffix}`;
  }
  if (target.type === "STORE_COVER") return `stores/${target.storeId}/cover-${suffix}`;
  if (target.type === "STORE_LOGO") return `stores/${target.storeId}/logo-${suffix}`;
  if (target.type === "SELLER_AVATAR") return `seller-avatar/${target.storeId}/avatar-${suffix}`;
  if (target.type === "CATEGORY_IMAGE") {
    return target.entityId ? `categories/${target.storeId}/${target.entityId}/image-${suffix}` : `categories/${target.storeId}/pending/image-${suffix}`;
  }

  return `stores/${target.storeId}/images/${suffix}`;
}

export async function prepareOptimizedImageUpload(file: File, target: ImageUploadTarget): Promise<OptimizedImageUpload | null> {
  if (!file || file.size === 0) return null;

  const validation = validateImageInputFile(file);
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImage(inputBuffer, {
    ...imageProfiles[target.type],
    originalMimeType: validation.originalMimeType,
    originalSize: validation.originalSize,
  });

  return {
    ...optimized,
    key: imageKey(target),
  };
}

export function imageAllowedPrefixes(storeId: string, type: ImageUploadType) {
  if (type === "PRODUCT_IMAGE") return [`products/${storeId}`, `stores/${storeId}/products`];
  if (type === "STORE_COVER") return [`stores/${storeId}`];
  if (type === "STORE_LOGO") return [`stores/${storeId}`];
  if (type === "SELLER_AVATAR") return [`seller-avatar/${storeId}`, `stores/${storeId}/seller-voice/avatar`];
  if (type === "CATEGORY_IMAGE") return [`categories/${storeId}`, `stores/${storeId}/categories`];
  return [`stores/${storeId}`];
}
