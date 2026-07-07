import { Prisma, StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto/encryption";

export const storePixelPlatforms = [StorePixelPlatform.META, StorePixelPlatform.TIKTOK, StorePixelPlatform.GOOGLE] as const;
export const storePixelStatuses = [StorePixelStatus.DRAFT, StorePixelStatus.ACTIVE, StorePixelStatus.DISABLED, StorePixelStatus.ERROR] as const;

export type StorePixelActor = {
  userId: string;
  isSuperAdmin?: boolean;
};

export type StorePixelIntegrationInput = {
  storeId?: string | null;
  platform: string;
  pixelId?: string | null;
  accessToken?: string | null;
  clearToken?: boolean;
  capiEnabled?: boolean;
  browserPixelEnabled?: boolean;
  testEventCode?: string | null;
  status?: string | null;
};

export type StorePixelIntegrationResult =
  | { ok: true; integration: StorePixelIntegrationRecord; store: StorePixelStoreRecord }
  | { ok: false; reason: string };

type StorePixelStoreRecord = {
  id: string;
  ownerId: string;
  slug: string;
};

type StorePixelIntegrationRecord = {
  id: string;
  storeId: string;
  platform: StorePixelPlatform;
  pixelId: string | null;
  accessTokenEncrypted: string | null;
  capiEnabled: boolean;
  browserPixelEnabled: boolean;
  testEventCode: string | null;
  status: StorePixelStatus;
};

type StorePixelDb = {
  store: {
    findFirst: (args: { where: Prisma.StoreWhereInput; select?: Prisma.StoreSelect }) => Promise<StorePixelStoreRecord | null>;
    findUnique: (args: { where: Prisma.StoreWhereUniqueInput; select?: Prisma.StoreSelect }) => Promise<StorePixelStoreRecord | null>;
  };
  storePixelIntegration: {
    findUnique: (args: {
      where: Prisma.StorePixelIntegrationWhereUniqueInput;
    }) => Promise<StorePixelIntegrationRecord | null>;
    upsert: (args: {
      where: Prisma.StorePixelIntegrationWhereUniqueInput;
      create: Prisma.StorePixelIntegrationUncheckedCreateInput;
      update: Prisma.StorePixelIntegrationUncheckedUpdateInput;
    }) => Promise<StorePixelIntegrationRecord>;
    update: (args: {
      where: Prisma.StorePixelIntegrationWhereUniqueInput;
      data: Prisma.StorePixelIntegrationUncheckedUpdateInput;
    }) => Promise<StorePixelIntegrationRecord>;
    delete: (args: { where: Prisma.StorePixelIntegrationWhereUniqueInput }) => Promise<StorePixelIntegrationRecord>;
  };
};

const storeSelect = { id: true, ownerId: true, slug: true } satisfies Prisma.StoreSelect;

function cleanOptional(value?: string | null, maxLength = 160) {
  const clean = value?.trim() ?? "";
  if (!clean) return null;
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

export function normalizeStorePixelPlatform(value: string): StorePixelPlatform | null {
  const clean = value.trim().toUpperCase();
  return storePixelPlatforms.includes(clean as StorePixelPlatform) ? (clean as StorePixelPlatform) : null;
}

export function normalizeStorePixelStatus(value?: string | null): StorePixelStatus {
  const clean = value?.trim().toUpperCase();
  return storePixelStatuses.includes(clean as StorePixelStatus) ? (clean as StorePixelStatus) : StorePixelStatus.DRAFT;
}

export function validateStorePixelId(platform: StorePixelPlatform, pixelId: string | null) {
  if (!pixelId) return true;
  if (platform === StorePixelPlatform.META) return /^\d{5,30}$/.test(pixelId);
  if (platform === StorePixelPlatform.TIKTOK) return /^[A-Za-z0-9_-]{3,80}$/.test(pixelId);
  return /^[A-Za-z0-9_.:-]{3,120}$/.test(pixelId);
}

export function storePixelPlatformLabel(platform: StorePixelPlatform) {
  if (platform === StorePixelPlatform.META) return "Meta Pixel";
  if (platform === StorePixelPlatform.TIKTOK) return "TikTok Pixel";
  return "Google";
}

export function storePixelStatusLabel(status: StorePixelStatus) {
  if (status === StorePixelStatus.ACTIVE) return "Activo";
  if (status === StorePixelStatus.DISABLED) return "Deshabilitado";
  if (status === StorePixelStatus.ERROR) return "Error";
  return "Borrador";
}

async function getManageableStore(db: StorePixelDb, actor: StorePixelActor, requestedStoreId?: string | null) {
  if (actor.isSuperAdmin && requestedStoreId) {
    return db.store.findUnique({ where: { id: requestedStoreId }, select: storeSelect });
  }

  const where: Prisma.StoreWhereInput = { ownerId: actor.userId };
  if (requestedStoreId) where.id = requestedStoreId;
  return db.store.findFirst({ where, select: storeSelect });
}

export async function upsertStorePixelIntegration(
  db: StorePixelDb,
  actor: StorePixelActor,
  input: StorePixelIntegrationInput,
): Promise<StorePixelIntegrationResult> {
  const platform = normalizeStorePixelPlatform(input.platform);
  if (!platform) return { ok: false, reason: "invalid_platform" };

  const store = await getManageableStore(db, actor, cleanOptional(input.storeId));
  if (!store) return { ok: false, reason: "store_not_found_or_forbidden" };

  const where = { storeId_platform: { storeId: store.id, platform } };
  const existing = await db.storePixelIntegration.findUnique({ where });
  const pixelId = cleanOptional(input.pixelId, 120) ?? existing?.pixelId ?? null;
  const accessToken = cleanOptional(input.accessToken, 5000);
  const testEventCode = cleanOptional(input.testEventCode, 120);
  const status = normalizeStorePixelStatus(input.status);
  const browserPixelEnabled = Boolean(input.browserPixelEnabled);
  let capiEnabled = Boolean(input.capiEnabled);

  if (!validateStorePixelId(platform, pixelId)) return { ok: false, reason: "invalid_pixel_id" };
  if (browserPixelEnabled && !pixelId) return { ok: false, reason: "browser_pixel_requires_pixel_id" };
  if (input.clearToken) capiEnabled = false;
  if (capiEnabled && !accessToken && !existing?.accessTokenEncrypted) return { ok: false, reason: "capi_requires_access_token" };
  if (accessToken && !isEncryptionConfigured()) return { ok: false, reason: "token_encryption_not_configured" };

  const tokenUpdate = input.clearToken
    ? { accessTokenEncrypted: null }
    : accessToken
      ? { accessTokenEncrypted: encryptSecret(accessToken) }
      : {};

  const integration = await db.storePixelIntegration.upsert({
    where,
    create: {
      storeId: store.id,
      platform,
      pixelId,
      ...tokenUpdate,
      capiEnabled,
      browserPixelEnabled,
      testEventCode,
      status,
    },
    update: {
      pixelId,
      ...tokenUpdate,
      capiEnabled,
      browserPixelEnabled,
      testEventCode,
      status,
    },
  });

  return { ok: true, integration, store };
}

export async function disableStorePixelIntegration(
  db: StorePixelDb,
  actor: StorePixelActor,
  input: { storeId?: string | null; platform: string },
): Promise<StorePixelIntegrationResult> {
  const platform = normalizeStorePixelPlatform(input.platform);
  if (!platform) return { ok: false, reason: "invalid_platform" };

  const store = await getManageableStore(db, actor, cleanOptional(input.storeId));
  if (!store) return { ok: false, reason: "store_not_found_or_forbidden" };

  const integration = await db.storePixelIntegration.update({
    where: { storeId_platform: { storeId: store.id, platform } },
    data: { status: StorePixelStatus.DISABLED, capiEnabled: false, browserPixelEnabled: false },
  });

  return { ok: true, integration, store };
}

export async function deleteStorePixelIntegration(
  db: StorePixelDb,
  actor: StorePixelActor,
  input: { storeId?: string | null; platform: string },
): Promise<StorePixelIntegrationResult> {
  const platform = normalizeStorePixelPlatform(input.platform);
  if (!platform) return { ok: false, reason: "invalid_platform" };

  const store = await getManageableStore(db, actor, cleanOptional(input.storeId));
  if (!store) return { ok: false, reason: "store_not_found_or_forbidden" };

  const integration = await db.storePixelIntegration.delete({
    where: { storeId_platform: { storeId: store.id, platform } },
  });

  return { ok: true, integration, store };
}
