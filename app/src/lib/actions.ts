"use server";

import { Prisma } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCountryCommerceConfig, normalizeCountryCode, normalizeCurrency } from "@/config/countries";
import { COMMERCIAL_SPACE_TEMPLATES, normalizeCommercialTemplate } from "@/config/commercial-templates";
import { rateLimitPolicies, userFacingRateLimitMessage } from "@/config/rate-limits";
import { registrationConfig } from "@/config/registration";
import { storePlans } from "@/config/plans";
import { createAttributionForStore } from "@/lib/acquisition/attribution";
import { clearAcquisitionCookies } from "@/lib/acquisition/cookies";
import { normalizePartnerCode, normalizePartnerDestinationSlug, validatePartnerDestinationTargetUrl } from "@/lib/acquisition/partners";
import { requireSuperAdmin } from "@/lib/admin";
import {
  passwordResetRequestedMessage,
  requestEmailVerificationForUser,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "@/lib/auth-account";
import { createSession, destroySession, hashPassword, requireStore, requireUser, verifyPassword } from "@/lib/auth";
import { COMMERCIAL_THEME_PRESETS, DEFAULT_COMMERCIAL_THEME, normalizeHexColor, type CommercialThemePresetKey } from "@/lib/commercial-theme";
import { sendOwnerCrmEvent, sendPartnerCrmEvent } from "@/lib/crm-webhook";
import { normalizeHostname, validateStoreDomainHostname, type StoreDomainKind } from "@/lib/domains";
import { makeSlug, normalizePhone, priceToCents } from "@/lib/format";
import { assertCanCreateProduct, getStorePlanState, PlanLimitError } from "@/lib/plan-limits";
import { isPartnerCommissionStatus, parseCommissionAmountToCents } from "@/lib/partner-commissions";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";
import { isValidStoreSlug, slugifyStoreName } from "@/lib/slug";
import { allowedImageDeletePrefixes, deleteJakawiMediaObjectIfOwned, deleteSellerVoiceObjectIfOwned, isJakawiMediaUrlOwnedByStore, uploadOptimizedImage } from "@/lib/storage";
import { buildRewardValueLabel, isStoreReferralRewardStatus, isStoreReferralRewardType, parseOptionalDate, parseOptionalPositiveInt, parseRewardAmountToCents } from "@/lib/store-referral-rewards";
import {
  isStorePaymentMethod,
  isStorePaymentPlanKey,
  isStorePaymentStatus,
  isStorePaymentType,
  parseOptionalPaymentDate,
  parsePaymentAmountToCents,
} from "@/lib/store-payments";
import { getVisitorInfoFromHeaders, hashIp } from "@/lib/visitor";
import { normalizeStorePlanCode } from "@/lib/storefront-flow";

const authSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8),
});

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function cleanOptional(value?: string | null) {
  const cleanValue = value?.trim() ?? "";
  return cleanValue.length ? cleanValue : null;
}

function adminReturnTo(formData: FormData, fallback: string) {
  const returnTo = field(formData, "returnTo");
  return returnTo.startsWith("/app/admin") ? returnTo : fallback;
}

function appendQueryParam(path: string, key: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

function looksLikeSensitivePaymentReference(value: string | null | undefined) {
  if (!value) return false;
  return /\d{13,19}/.test(value.replace(/[\s-]/g, ""));
}

const manualStoreDomainTypes = ["CUSTOM_DOMAIN", "JAKAWI_SUBDOMAIN"] as const;
const manualStoreDomainStatuses = ["PENDING", "VERIFYING", "ACTIVE", "FAILED", "DISABLED"] as const;
const manualStoreDomainVerificationTypes = ["NONE", "DNS_TXT", "DNS_CNAME", "MANUAL"] as const;

function normalizeManualStoreDomainType(value: string): (typeof manualStoreDomainTypes)[number] | null {
  const normalized = value.trim().toUpperCase();
  return manualStoreDomainTypes.find((item) => item === normalized) ?? null;
}

function normalizeManualStoreDomainStatus(value: string): (typeof manualStoreDomainStatuses)[number] {
  const normalized = value.trim().toUpperCase();
  return manualStoreDomainStatuses.find((item) => item === normalized) ?? "PENDING";
}

function normalizeManualStoreDomainVerificationType(value: string): (typeof manualStoreDomainVerificationTypes)[number] {
  const normalized = value.trim().toUpperCase();
  return manualStoreDomainVerificationTypes.find((item) => item === normalized) ?? "NONE";
}

function uploadErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos procesar esta imagen. Sube una imagen JPG, PNG o WebP.";
}

async function uniqueStoreSlug(input: string, currentStoreId?: string) {
  const base = slugifyStoreName(input);
  if (!base || !isValidStoreSlug(base)) throw new Error("Ese link comercial no esta disponible.");

  const existing = await getPrisma().store.findUnique({ where: { slug: base } });
  if (existing && existing.id !== currentStoreId) throw new Error("Ese link comercial ya esta en uso.");
  return base;
}

async function uniqueProductSlug(storeId: string, input: string, currentProductId?: string) {
  const base = makeSlug(input);
  if (!base) throw new Error("El producto necesita un slug valido.");

  const existing = await getPrisma().product.findUnique({ where: { storeId_slug: { storeId, slug: base } } });
  if (existing && existing.id !== currentProductId) throw new Error("Ese slug de producto ya existe.");
  return base;
}

export async function registerAction(formData: FormData) {
  const registrationSchema = authSchema.extend({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .refine((value) => isValidPhoneNumber(value)),
    storeName: z.string().min(2),
    storeSlug: z.string().min(3).max(40).refine(isValidStoreSlug),
    countryCode: z.string().min(2).max(5).optional().or(z.literal("")),
    countryName: z.string().max(80).optional().or(z.literal("")),
    currency: z.string().min(3).max(3).optional().or(z.literal("")),
    locale: z.string().max(20).optional().or(z.literal("")),
    timezone: z.string().max(80).optional().or(z.literal("")),
    city: z.string().max(80).optional().or(z.literal("")),
    region: z.string().max(80).optional().or(z.literal("")),
    plan: z.string().max(20).optional().or(z.literal("")),
  });

  const parsed = registrationSchema.safeParse({
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    phone: field(formData, "phone") || field(formData, "whatsapp"),
    storeName: field(formData, "storeName"),
    storeSlug: field(formData, "storeSlug"),
    countryCode: field(formData, "countryCode"),
    countryName: field(formData, "countryName"),
    currency: field(formData, "currency"),
    locale: field(formData, "locale"),
    timezone: field(formData, "timezone"),
    city: field(formData, "city"),
    region: field(formData, "region"),
    plan: field(formData, "plan"),
  });

  if (!parsed.success) {
    redirect("/registro?error=Revisa los datos del formulario");
  }

  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);
  const [ipLimit, slugLimit] = await Promise.all([
    checkRateLimit({ policy: rateLimitPolicies.REGISTER, keyParts: [clientIp] }),
    checkRateLimit({ policy: rateLimitPolicies.REGISTER_STORE_SLUG, keyParts: [parsed.data.storeSlug] }),
  ]);
  if (!ipLimit.allowed || !slugLimit.allowed) {
    redirect(`/registro?error=${encodeURIComponent(userFacingRateLimitMessage)}`);
  }

  const visitor = getVisitorInfoFromHeaders(requestHeaders);
  const slug = await uniqueStoreSlug(parsed.data.storeSlug).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Ese link comercial no esta disponible.";
    redirect(`/registro?error=${encodeURIComponent(message)}`);
  });
  const passwordHash = await hashPassword(parsed.data.password);
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const name = `${firstName} ${lastName}`.trim();
  const countryCode = normalizeCountryCode(cleanOptional(parsed.data.countryCode) ?? visitor.countryCode);
  const countryConfig = getCountryCommerceConfig(countryCode);
  const countryName = cleanOptional(parsed.data.countryName) ?? countryConfig.countryName ?? visitor.countryName;
  const currency = normalizeCurrency(parsed.data.currency, countryCode);
  const locale = cleanOptional(parsed.data.locale) ?? countryConfig.locale;
  const timezone = cleanOptional(parsed.data.timezone) ?? countryConfig.timezone;
  const city = cleanOptional(parsed.data.city) ?? visitor.city;
  const region = cleanOptional(parsed.data.region) ?? visitor.region;
  const ipHash = visitor.ip ? hashIp(visitor.ip) : null;
  const plan = normalizeStorePlanCode(parsed.data.plan);
  const trialDays = storePlans.TRIAL.trialDays ?? 14;
  const now = new Date();

  try {
    const user = await getPrisma().user.create({
      data: {
        name,
        firstName,
        lastName,
        email: parsed.data.email,
        passwordHash,
        phone: parsed.data.phone,
        countryCode,
        countryName,
        currency,
        city,
        region,
        ipHash,
        stores: {
          create: {
            name: parsed.data.storeName,
            slug,
            whatsapp: parsed.data.phone,
            countryCode,
            countryName,
            currency,
            locale,
            timezone,
            city,
            region,
            description: "Mi espacio comercial creado con JAKAWI.",
            isPublished: true,
            plan,
            planStatus: plan === "TRIAL" ? "TRIALING" : "ACTIVE",
            planStartedAt: now,
            trialEndsAt: plan === "TRIAL" ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null,
          },
        },
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
            countryCode: true,
            countryName: true,
            currency: true,
            plan: true,
            planStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const store = user.stores[0];
    if (store) {
      try {
        await createAttributionForStore({ storeId: store.id, userId: user.id });
      } catch (attributionError) {
        console.warn("Could not create acquisition attribution", attributionError);
      }

      await sendOwnerCrmEvent({
        user,
        store,
        event: "owner.registered",
        sourceFlow: "registration",
      });
    }

    try {
      await requestEmailVerificationForUser(user.id);
    } catch (verificationError) {
      console.warn("Could not prepare email verification token", verificationError instanceof Error ? verificationError.message : "unknown error");
    }

    await createSession(user.id);
    await clearAcquisitionCookies();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/registro?error=Este email o link comercial ya esta registrado");
    }
    throw error;
  }

  redirect(registrationConfig.routeAfterRegister);
}

export async function loginAction(formData: FormData) {
  const parsed = authSchema.parse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });

  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);
  const [emailLimit, ipLimit] = await Promise.all([
    checkRateLimit({ policy: rateLimitPolicies.LOGIN, keyParts: [clientIp, parsed.email] }),
    checkRateLimit({ policy: rateLimitPolicies.LOGIN_IP, keyParts: [clientIp] }),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    redirect(`/login?error=${encodeURIComponent(userFacingRateLimitMessage)}`);
  }

  const user = await getPrisma().user.findUnique({ where: { email: parsed.email } });
  if (!user || !(await verifyPassword(parsed.password, user.passwordHash))) {
    redirect("/login?error=Credenciales invalidas");
  }

  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);
  const [emailLimit, ipLimit] = await Promise.all([
    checkRateLimit({ policy: rateLimitPolicies.PASSWORD_RESET, keyParts: [clientIp, email] }),
    checkRateLimit({ policy: rateLimitPolicies.PASSWORD_RESET_IP, keyParts: [clientIp] }),
  ]);

  if (!emailLimit.allowed || !ipLimit.allowed) {
    redirect(`/forgot-password?error=${encodeURIComponent(userFacingRateLimitMessage)}`);
  }

  await requestPasswordReset(email);
  redirect(`/forgot-password?sent=${encodeURIComponent(passwordResetRequestedMessage)}`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = field(formData, "token");
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");

  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Los passwords no coinciden.")}`);
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(result.error)}`);
  }

  redirect("/login?message=Password actualizado. Entra con tu nuevo password.");
}

export async function requestEmailVerificationAction() {
  const user = await requireUser();
  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);
  const limit = await checkRateLimit({ policy: rateLimitPolicies.EMAIL_VERIFICATION, keyParts: [clientIp, user.id] });

  if (!limit.allowed) {
    redirect(`/app?error=${encodeURIComponent(userFacingRateLimitMessage)}`);
  }

  await requestEmailVerificationForUser(user.id);
  redirect("/app");
}

export async function verifyEmailAction(formData: FormData) {
  const token = field(formData, "token");
  const result = await verifyEmailWithToken(token);

  if (!result.ok) {
    redirect(`/verify-email?token=${encodeURIComponent(token)}&error=${encodeURIComponent(result.error)}`);
  }

  redirect("/verify-email?status=ok");
}

export async function updateStoreAction(formData: FormData) {
  const { store } = await requireStore();
  const name = field(formData, "name");
  const slug = await uniqueStoreSlug(field(formData, "slug"), store.id);
  const cover = formData.get("cover");
  const logo = formData.get("logo");
  const countryCode = normalizeCountryCode(field(formData, "countryCode") || store.countryCode);
  const countryConfig = getCountryCommerceConfig(countryCode);
  const currency = normalizeCurrency(field(formData, "currency") || store.currency, countryCode);

  let coverUrl: string | null = null;
  let logoUrl: string | null = null;
  try {
    const uploadedCover = cover instanceof File && cover.size > 0 ? await uploadOptimizedImage(cover, { type: "STORE_COVER", storeId: store.id }) : null;
    const uploadedLogo = logo instanceof File && logo.size > 0 ? await uploadOptimizedImage(logo, { type: "STORE_LOGO", storeId: store.id }) : null;
    coverUrl = uploadedCover?.url ?? null;
    logoUrl = uploadedLogo?.url ?? null;
  } catch (error) {
    redirect(`/app/tienda?error=${encodeURIComponent(uploadErrorMessage(error))}`);
  }

  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      name,
      slug,
      description: cleanOptional(field(formData, "description")),
      commercialTagline: cleanOptional(field(formData, "commercialTagline")),
      whatsapp: normalizePhone(field(formData, "whatsapp")),
      instagram: cleanOptional(field(formData, "instagram")),
      tiktok: cleanOptional(field(formData, "tiktok")),
      countryCode,
      countryName: countryConfig.countryName,
      currency,
      locale: countryConfig.locale,
      timezone: countryConfig.timezone,
      ...(coverUrl ? { coverUrl } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await Promise.all([
    coverUrl ? deleteJakawiMediaObjectIfOwned(store.coverUrl, { storeId: store.id, allowedPrefixes: allowedImageDeletePrefixes(store.id, "STORE_COVER"), newUrl: coverUrl }) : Promise.resolve(false),
    logoUrl ? deleteJakawiMediaObjectIfOwned(store.logoUrl, { storeId: store.id, allowedPrefixes: allowedImageDeletePrefixes(store.id, "STORE_LOGO"), newUrl: logoUrl }) : Promise.resolve(false),
  ]);

  revalidatePath("/app");
  revalidatePath("/app/tienda");
  revalidatePath(`/${store.slug}`);
  revalidatePath(`/${slug}`);
  redirect("/app/tienda?ok=1");
}

function getCommercialThemePreset(value: string): CommercialThemePresetKey {
  if (value in COMMERCIAL_THEME_PRESETS) return value as CommercialThemePresetKey;
  return DEFAULT_COMMERCIAL_THEME.preset;
}

export async function updateStoreVisualIdentityAction(formData: FormData) {
  const { store } = await requireStore();
  const shouldReset = field(formData, "visualIdentityReset") === "1";
  const presetKey = shouldReset ? DEFAULT_COMMERCIAL_THEME.preset : getCommercialThemePreset(field(formData, "brandThemePreset"));
  const preset = COMMERCIAL_THEME_PRESETS[presetKey];

  const primary = shouldReset ? preset.primary : normalizeHexColor(field(formData, "brandPrimaryColor"), preset.primary);
  const background = shouldReset ? preset.background : normalizeHexColor(field(formData, "brandBackgroundColor"), preset.background);
  const accent = shouldReset ? preset.accent : normalizeHexColor(field(formData, "brandAccentColor"), preset.accent);

  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      brandThemePreset: presetKey,
      brandPrimaryColor: primary,
      brandBackgroundColor: background,
      brandAccentColor: accent,
    },
  });

  revalidatePath("/app/tienda");
  revalidatePath(`/${store.slug}`);
  redirect("/app/tienda?ok=visual");
}

export async function updateStoreCommercialTemplateAction(formData: FormData) {
  const { store } = await requireStore();
  const commercialTemplate = normalizeCommercialTemplate(field(formData, "commercialTemplate"));
  const templateConfig = COMMERCIAL_SPACE_TEMPLATES[commercialTemplate];

  if (!templateConfig.isAvailable) {
    redirect("/app/tienda?error=Ese estilo aun no esta disponible");
  }

  await getPrisma().store.update({
    where: { id: store.id },
    data: { commercialTemplate },
  });

  revalidatePath("/app/tienda");
  revalidatePath(`/${store.slug}`);
  redirect("/app/tienda?ok=template");
}

export async function createCategoryAction(formData: FormData) {
  const { store } = await requireStore();
  const name = field(formData, "name");
  const slug = makeSlug(name);

  await getPrisma().category.create({ data: { storeId: store.id, name, slug } });
  revalidatePath("/app/categorias");
}

export async function renameCategoryAction(formData: FormData) {
  const { store } = await requireStore();
  const id = field(formData, "categoryId");
  const name = field(formData, "name");

  await getPrisma().category.update({
    where: { id, storeId: store.id },
    data: { name, slug: makeSlug(name) },
  });
  revalidatePath("/app/categorias");
}

export async function deleteCategoryAction(formData: FormData) {
  const { store } = await requireStore();
  const id = field(formData, "categoryId");
  const count = await getPrisma().product.count({ where: { storeId: store.id, categoryId: id } });
  if (count > 0) redirect("/app/categorias?error=No puedes borrar una categoria con productos");

  await getPrisma().category.delete({ where: { id, storeId: store.id } });
  revalidatePath("/app/categorias");
}

export async function saveProductAction(formData: FormData) {
  const { store } = await requireStore();
  const productId = field(formData, "productId");
  const name = field(formData, "name");
  const slug = await uniqueProductSlug(store.id, field(formData, "slug") || name, productId || undefined);
  const image = formData.get("image");
  const categoryId = cleanOptional(field(formData, "categoryId"));
  const isVisible = formData.get("isVisible") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const storeCurrency = normalizeCurrency(store.currency, store.countryCode);

  if (productId) {
    const currentProduct = await getPrisma().product.findUnique({ where: { id: productId, storeId: store.id }, select: { imageUrl: true, isFeatured: true } });
    if (!currentProduct) redirect("/app/productos");

    let imageUrl: string | null = null;
    try {
      const uploadedImage = image instanceof File && image.size > 0 ? await uploadOptimizedImage(image, { type: "PRODUCT_IMAGE", storeId: store.id, entityId: productId }) : null;
      imageUrl = uploadedImage?.url ?? null;
    } catch (error) {
      redirect(`/app/productos/${productId}/editar?error=${encodeURIComponent(uploadErrorMessage(error))}`);
    }

    await getPrisma().product.update({
      where: { id: productId, storeId: store.id },
      data: {
        name,
        slug,
        description: cleanOptional(field(formData, "description")),
        priceCents: priceToCents(formData.get("price")),
        currency: storeCurrency,
        categoryId,
        isVisible,
        isFeatured,
        featuredAt: isFeatured ? currentProduct.isFeatured ? undefined : new Date() : null,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    if (imageUrl) {
      await deleteJakawiMediaObjectIfOwned(currentProduct.imageUrl, { storeId: store.id, allowedPrefixes: allowedImageDeletePrefixes(store.id, "PRODUCT_IMAGE"), newUrl: imageUrl });
    }
  } else {
    try {
      await assertCanCreateProduct(store.id);
    } catch (error) {
      if (error instanceof PlanLimitError) {
        redirect(`/app/productos/nuevo?error=${encodeURIComponent(error.payload.message)}`);
      }
      throw error;
    }

    const product = await getPrisma().product.create({
      data: {
        storeId: store.id,
        categoryId,
        name,
        slug,
        description: cleanOptional(field(formData, "description")),
        priceCents: priceToCents(formData.get("price")),
        currency: storeCurrency,
        isVisible,
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
      },
    });
    let imageUrl: string | null = null;
    try {
      const uploadedImage = image instanceof File && image.size > 0 ? await uploadOptimizedImage(image, { type: "PRODUCT_IMAGE", storeId: store.id, entityId: product.id }) : null;
      imageUrl = uploadedImage?.url ?? null;
    } catch (error) {
      await getPrisma().product.delete({ where: { id: product.id, storeId: store.id } });
      redirect(`/app/productos/nuevo?error=${encodeURIComponent(uploadErrorMessage(error))}`);
    }

    if (imageUrl) {
      await getPrisma().product.update({ where: { id: product.id }, data: { imageUrl } });
    }
  }

  revalidatePath("/app/productos");
  revalidatePath(`/${store.slug}`);
  redirect("/app/productos");
}

export async function toggleFeaturedProductAction(formData: FormData) {
  const { store } = await requireStore();
  const id = field(formData, "productId");
  const product = await getPrisma().product.findUnique({ where: { id, storeId: store.id } });
  if (!product) redirect("/app/productos");

  const nextFeatured = !product.isFeatured;
  await getPrisma().product.update({
    where: { id },
    data: {
      isFeatured: nextFeatured,
      featuredAt: nextFeatured ? new Date() : null,
    },
  });
  revalidatePath("/app/productos");
  revalidatePath(`/${store.slug}`);
}

export async function toggleProductAction(formData: FormData) {
  const { store } = await requireStore();
  const id = field(formData, "productId");
  const product = await getPrisma().product.findUnique({ where: { id, storeId: store.id } });
  if (!product) redirect("/app/productos");

  await getPrisma().product.update({ where: { id }, data: { isVisible: !product.isVisible } });
  revalidatePath("/app/productos");
  revalidatePath(`/${store.slug}`);
}

export async function deleteProductAction(formData: FormData) {
  const { store } = await requireStore();
  const id = field(formData, "productId");
  await getPrisma().product.delete({ where: { id, storeId: store.id } });
  revalidatePath("/app/productos");
  revalidatePath(`/${store.slug}`);
}

export async function updateWhatsappAction(formData: FormData) {
  const { store } = await requireStore();
  await getPrisma().store.update({
    where: { id: store.id },
    data: { whatsapp: normalizePhone(field(formData, "whatsapp")) },
  });
  revalidatePath("/app/whatsapp");
  revalidatePath(`/${store.slug}`);
}

function jakawiMediaUrlField(formData: FormData, name: string, storeId: string, existingUrl?: string | null) {
  const value = field(formData, name);
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const url = parsed.toString();
    const isOwnedAvatarUrl = isJakawiMediaUrlOwnedByStore(url, { storeId, allowedPrefixes: allowedImageDeletePrefixes(storeId, "SELLER_AVATAR") });
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !isOwnedAvatarUrl) return existingUrl ?? null;
    return parsed.toString();
  } catch {
    return existingUrl ?? null;
  }
}

function audioUrlField(formData: FormData, name: string, existingUrl?: string | null) {
  if (!formData.has(name)) return existingUrl ?? null;

  const value = field(formData, name);
  if (value === "__DELETE__") return null;
  if (!value) return existingUrl ?? null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return existingUrl ?? null;
    return parsed.toString();
  } catch {
    return existingUrl ?? null;
  }
}

function durationField(formData: FormData, name: string) {
  const value = Number.parseInt(field(formData, name), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(value, 60);
}

function enabledField(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function transcriptField(formData: FormData, name: string) {
  const value = field(formData, name).replace(/\s+/g, " ");
  return value ? value.slice(0, 800) : null;
}

function assertTranscriptForAudio(audioUrl: string | null, transcript: string | null, label: string) {
  if (audioUrl && !transcript) {
    throw new Error(`La transcripción de ${label} es obligatoria si subes audio.`);
  }
}

export async function saveSellerVoiceNotesSettingsAction(formData: FormData) {
  const { store } = await requireStore();
  const planState = getStorePlanState(store);
  if (!planState.sellerAiEnabled) {
    redirect("/app/seller-ai?error=voice-plan");
  }

  const sellerIntroAudioUrl = audioUrlField(formData, "sellerIntroAudioUrl", store.sellerIntroAudioUrl);
  const sellerIntroTranscript = transcriptField(formData, "sellerIntroTranscript");
  const sellerGuidanceAudioUrl = audioUrlField(formData, "sellerGuidanceAudioUrl", store.sellerGuidanceAudioUrl);
  const sellerGuidanceTranscript = transcriptField(formData, "sellerGuidanceTranscript");
  const sellerHandoffAudioUrl = audioUrlField(formData, "sellerHandoffAudioUrl", store.sellerHandoffAudioUrl);
  const sellerHandoffTranscript = transcriptField(formData, "sellerHandoffTranscript");
  const sellerVoiceAvatarUrl = jakawiMediaUrlField(formData, "sellerVoiceAvatarUrl", store.id, store.sellerVoiceAvatarUrl);

  try {
    assertTranscriptForAudio(sellerIntroAudioUrl, sellerIntroTranscript, "bienvenida");
    assertTranscriptForAudio(sellerGuidanceAudioUrl, sellerGuidanceTranscript, "orientación");
    assertTranscriptForAudio(sellerHandoffAudioUrl, sellerHandoffTranscript, "cierre");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revisa las transcripciones.";
    redirect(`/app/seller-ai?error=${encodeURIComponent(message)}`);
  }

  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      sellerVoiceEnabled: enabledField(formData, "sellerVoiceEnabled"),
      sellerVoiceDisplayName: cleanOptional(field(formData, "sellerVoiceDisplayName")),
      sellerVoiceAvatarUrl,
      sellerIntroEnabled: enabledField(formData, "sellerIntroEnabled"),
      sellerIntroAudioUrl,
      sellerIntroTranscript,
      sellerIntroDurationSeconds: durationField(formData, "sellerIntroDurationSeconds"),
      sellerGuidanceEnabled: enabledField(formData, "sellerGuidanceEnabled"),
      sellerGuidanceAudioUrl,
      sellerGuidanceTranscript,
      sellerGuidanceDurationSeconds: durationField(formData, "sellerGuidanceDurationSeconds"),
      sellerHandoffEnabled: enabledField(formData, "sellerHandoffEnabled"),
      sellerHandoffAudioUrl,
      sellerHandoffTranscript,
      sellerHandoffDurationSeconds: durationField(formData, "sellerHandoffDurationSeconds"),
    },
  });

  await Promise.all([
    store.sellerIntroAudioUrl !== sellerIntroAudioUrl ? deleteSellerVoiceObjectIfOwned(store.sellerIntroAudioUrl) : Promise.resolve(false),
    store.sellerGuidanceAudioUrl !== sellerGuidanceAudioUrl ? deleteSellerVoiceObjectIfOwned(store.sellerGuidanceAudioUrl) : Promise.resolve(false),
    store.sellerHandoffAudioUrl !== sellerHandoffAudioUrl ? deleteSellerVoiceObjectIfOwned(store.sellerHandoffAudioUrl) : Promise.resolve(false),
    store.sellerVoiceAvatarUrl !== sellerVoiceAvatarUrl
      ? deleteJakawiMediaObjectIfOwned(store.sellerVoiceAvatarUrl, { storeId: store.id, allowedPrefixes: allowedImageDeletePrefixes(store.id, "SELLER_AVATAR"), newUrl: sellerVoiceAvatarUrl })
      : Promise.resolve(false),
  ]);

  revalidatePath("/app/tienda");
  revalidatePath("/app/seller-ai");
  revalidatePath(`/${store.slug}`);
  redirect("/app/seller-ai?ok=voice");
}

export async function updateStorePlanAction(formData: FormData) {
  await requireSuperAdmin();
  const storeId = field(formData, "storeId");
  const plan = normalizeStorePlanCode(field(formData, "plan"));
  const store = await getPrisma().store.findUnique({ where: { id: storeId } });
  if (!store) redirect("/app/admin/stores?error=Tienda no encontrada");

  const now = new Date();
  const trialDays = storePlans.TRIAL.trialDays ?? 14;
  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      plan,
      planStatus: plan === "TRIAL" ? "TRIALING" : "ACTIVE",
      planStartedAt: store.planStartedAt ?? now,
      trialEndsAt: plan === "TRIAL" ? store.trialEndsAt ?? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : store.trialEndsAt,
      sellerAiPeriodStart: now,
      sellerAiConversationCount: 0,
    },
  });

  revalidatePath("/app/admin/stores");
  redirect("/app/admin/stores?ok=plan");
}

export async function extendStoreTrialAction(formData: FormData) {
  await requireSuperAdmin();
  const storeId = field(formData, "storeId");
  const days = Math.max(1, Math.min(90, Number(field(formData, "days") || 14)));
  const store = await getPrisma().store.findUnique({ where: { id: storeId } });
  if (!store) redirect("/app/admin/stores?error=Tienda no encontrada");

  const base = store.trialEndsAt && store.trialEndsAt > new Date() ? store.trialEndsAt : new Date();
  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      plan: "TRIAL",
      planStatus: "TRIALING",
      trialEndsAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/app/admin/stores");
  redirect("/app/admin/stores?ok=trial");
}

export async function createStoreDomainManualAction(formData: FormData) {
  await requireSuperAdmin();
  const returnTo = adminReturnTo(formData, "/app/admin/stores");
  const storeId = field(formData, "storeId");
  const type = normalizeManualStoreDomainType(field(formData, "type"));
  const hostnameInput = field(formData, "hostname");
  const status = normalizeManualStoreDomainStatus(field(formData, "status"));
  const verificationType = normalizeManualStoreDomainVerificationType(field(formData, "verificationType"));
  const isPrimary = field(formData, "isPrimary") === "true" || field(formData, "isPrimary") === "on";

  if (!type) redirect(appendQueryParam(returnTo, "error", "Tipo de dominio invalido"));

  const validation = validateStoreDomainHostname(hostnameInput, { type: type as StoreDomainKind });
  if (!validation.ok) redirect(appendQueryParam(returnTo, "error", `Dominio invalido: ${validation.reason}`));

  const store = await getPrisma().store.findUnique({ where: { id: storeId }, select: { id: true, slug: true } });
  if (!store) redirect(appendQueryParam(returnTo, "error", "Tienda no encontrada"));

  const data = {
    storeId: store.id,
    hostname: normalizeHostname(validation.hostname),
    type,
    status,
    isPrimary,
    verificationType,
    verificationValue: cleanOptional(field(formData, "verificationValue")),
    cloudflareHostnameId: cleanOptional(field(formData, "cloudflareHostnameId")),
    sslStatus: cleanOptional(field(formData, "sslStatus")),
  };

  if (isPrimary) {
    await getPrisma().$transaction([
      getPrisma().storeDomain.updateMany({ where: { storeId: store.id, isPrimary: true }, data: { isPrimary: false } }),
      getPrisma().storeDomain.create({ data }),
    ]);
  } else {
    await getPrisma().storeDomain.create({ data });
  }

  revalidatePath("/app/admin/stores");
  revalidatePath(`/${store.slug}`);
  redirect(appendQueryParam(returnTo, "ok", "domain"));
}

export async function createStorePaymentAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const returnTo = adminReturnTo(formData, "/app/admin/payments");
  const storeId = field(formData, "storeId");
  const planKeyInput = cleanOptional(field(formData, "planKey"));
  const paymentType = field(formData, "paymentType");
  const amountCents = parsePaymentAmountToCents(formData.get("amount"));
  const currency = (field(formData, "currency") || "BOB").toUpperCase();
  const paymentMethodInput = cleanOptional(field(formData, "paymentMethod"));
  const externalReference = cleanOptional(field(formData, "externalReference"));
  const periodStart = parseOptionalPaymentDate(formData.get("periodStart"));
  const periodEnd = parseOptionalPaymentDate(formData.get("periodEnd"));
  const paidAt = parseOptionalPaymentDate(formData.get("paidAt"));

  if (planKeyInput && !isStorePaymentPlanKey(planKeyInput)) redirect(appendQueryParam(returnTo, "error", "Plan invalido"));
  if (!isStorePaymentType(paymentType)) redirect(appendQueryParam(returnTo, "error", "Tipo de pago invalido"));
  if (!amountCents || amountCents <= 0) redirect(appendQueryParam(returnTo, "error", "Monto invalido"));
  if (!/^[A-Z]{3}$/.test(currency)) redirect(appendQueryParam(returnTo, "error", "Moneda invalida"));
  if (paymentMethodInput && !isStorePaymentMethod(paymentMethodInput)) redirect(appendQueryParam(returnTo, "error", "Metodo invalido"));
  if (looksLikeSensitivePaymentReference(externalReference)) {
    redirect(appendQueryParam(returnTo, "error", "La referencia externa no debe incluir numeros completos de tarjeta o cuenta"));
  }
  if (periodStart && periodEnd && periodEnd < periodStart) redirect(appendQueryParam(returnTo, "error", "Periodo invalido"));

  const store = await getPrisma().store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) redirect(appendQueryParam(returnTo, "error", "Tienda no encontrada"));

  await getPrisma().storePayment.create({
    data: {
      storeId: store.id,
      planKey: planKeyInput,
      paymentType,
      amountCents,
      currency,
      status: "PENDING",
      paymentMethod: paymentMethodInput,
      externalReference,
      description: cleanOptional(field(formData, "description")),
      notes: cleanOptional(field(formData, "notes")),
      periodStart,
      periodEnd,
      paidAt,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/payments");
  revalidatePath("/app/admin/stores");
  revalidatePath("/app/plan");
  redirect(appendQueryParam(returnTo, "ok", "created"));
}

export async function updateStorePaymentStatusAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const returnTo = adminReturnTo(formData, "/app/admin/payments");
  const paymentId = field(formData, "paymentId");
  const status = field(formData, "status");
  const notes = cleanOptional(field(formData, "notes"));
  const externalReference = cleanOptional(field(formData, "externalReference"));

  if (!isStorePaymentStatus(status)) redirect(appendQueryParam(returnTo, "error", "Estado invalido"));
  if (looksLikeSensitivePaymentReference(externalReference)) {
    redirect(appendQueryParam(returnTo, "error", "La referencia externa no debe incluir numeros completos de tarjeta o cuenta"));
  }

  const payment = await getPrisma().storePayment.findUnique({ where: { id: paymentId }, include: { store: { select: { slug: true } } } });
  if (!payment) redirect(appendQueryParam(returnTo, "error", "Pago no encontrado"));

  const now = new Date();
  await getPrisma().storePayment.update({
    where: { id: payment.id },
    data: {
      status,
      notes: notes ?? payment.notes,
      externalReference: externalReference ?? payment.externalReference,
      confirmedAt: status === "CONFIRMED" ? payment.confirmedAt ?? now : payment.confirmedAt,
      cancelledAt: status === "CANCELLED" ? payment.cancelledAt ?? now : payment.cancelledAt,
      refundedAt: status === "REFUNDED" ? payment.refundedAt ?? now : payment.refundedAt,
      confirmedByUserId: status === "CONFIRMED" ? payment.confirmedByUserId ?? user.id : payment.confirmedByUserId,
      cancelledByUserId: status === "CANCELLED" ? payment.cancelledByUserId ?? user.id : payment.cancelledByUserId,
      refundedByUserId: status === "REFUNDED" ? payment.refundedByUserId ?? user.id : payment.refundedByUserId,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/payments");
  revalidatePath("/app/admin/stores");
  revalidatePath("/app/plan");
  revalidatePath(`/${payment.store.slug}`);
  redirect(appendQueryParam(returnTo, "ok", "status"));
}

export async function updateStorePaymentNotesAction(formData: FormData) {
  await requireSuperAdmin();
  const returnTo = adminReturnTo(formData, "/app/admin/payments");
  const paymentId = field(formData, "paymentId");
  const externalReference = cleanOptional(field(formData, "externalReference"));
  if (looksLikeSensitivePaymentReference(externalReference)) {
    redirect(appendQueryParam(returnTo, "error", "La referencia externa no debe incluir numeros completos de tarjeta o cuenta"));
  }

  const payment = await getPrisma().storePayment.findUnique({ where: { id: paymentId } });
  if (!payment) redirect(appendQueryParam(returnTo, "error", "Pago no encontrado"));

  await getPrisma().storePayment.update({
    where: { id: payment.id },
    data: {
      notes: cleanOptional(field(formData, "notes")),
      externalReference,
      description: cleanOptional(field(formData, "description")),
    },
  });

  revalidatePath("/app/admin/payments");
  revalidatePath("/app/admin/stores");
  revalidatePath("/app/plan");
  redirect(appendQueryParam(returnTo, "ok", "notes"));
}

export async function createPartnerAction(formData: FormData) {
  await requireSuperAdmin();
  const name = field(formData, "name");
  const submittedCode = field(formData, "code");
  const code = normalizePartnerCode(submittedCode || name);
  const commissionRateBps = Math.max(0, Math.min(10000, Number(field(formData, "commissionRateBps") || 2000)));
  let createdPartner:
    | {
        id: string;
        name: string;
        code: string;
        contactName: string | null;
        contactEmail: string | null;
        status: string;
        createdAt: Date;
      }
    | null = null;

  if (!name || !code) redirect("/app/admin/partners?error=Nombre o codigo invalido");

  try {
    createdPartner = await getPrisma().partner.create({
      data: {
        name,
        code,
        contactName: cleanOptional(field(formData, "contactName")),
        contactEmail: cleanOptional(field(formData, "contactEmail")),
        contactPhone: cleanOptional(field(formData, "contactPhone")),
        commissionRateBps,
        notes: cleanOptional(field(formData, "notes")),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/app/admin/partners?error=Ese codigo de partner ya existe");
    }
    throw error;
  }

  if (createdPartner) {
    await sendPartnerCrmEvent({ partner: createdPartner, sourceFlow: "admin_partner_create" });
  }

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/partners");
  redirect("/app/admin/partners?ok=created");
}

export async function createPartnerDestinationAction(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = field(formData, "partnerId");
  const label = field(formData, "label");
  const slug = normalizePartnerDestinationSlug(field(formData, "slug") || label);
  const shouldBeDefault = formData.get("isDefault") === "on";
  let targetUrl: string;

  if (!label || !slug) redirect("/app/admin/partners?error=Destino invalido");

  try {
    targetUrl = validatePartnerDestinationTargetUrl(field(formData, "targetUrl"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Destino invalido";
    redirect(`/app/admin/partners?error=${encodeURIComponent(message)}`);
  }

  const partner = await getPrisma().partner.findUnique({ where: { id: partnerId }, select: { id: true } });
  if (!partner) redirect("/app/admin/partners?error=Partner no encontrado");

  try {
    if (shouldBeDefault) {
      await getPrisma().$transaction([
        getPrisma().partnerDestination.updateMany({
          where: { partnerId: partner.id, isDefault: true },
          data: { isDefault: false },
        }),
        getPrisma().partnerDestination.create({
          data: {
            partnerId: partner.id,
            label,
            slug,
            targetUrl,
            isDefault: true,
            notes: cleanOptional(field(formData, "notes")),
          },
        }),
      ]);
    } else {
      await getPrisma().partnerDestination.create({
        data: {
          partnerId: partner.id,
          label,
          slug,
          targetUrl,
          notes: cleanOptional(field(formData, "notes")),
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/app/admin/partners?error=Ese slug de destino ya existe para este partner");
    }
    throw error;
  }

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/partners");
  redirect("/app/admin/partners?ok=destination");
}

export async function updatePartnerStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = field(formData, "partnerId");
  const status = field(formData, "status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const partner = await getPrisma().partner.findUnique({ where: { id: partnerId } });
  if (!partner) redirect("/app/admin/partners?error=Partner no encontrado");

  await getPrisma().partner.update({
    where: { id: partner.id },
    data: { status },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/partners");
  redirect("/app/admin/partners?ok=status");
}

export async function updatePartnerDestinationStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const destinationId = field(formData, "destinationId");
  const status = field(formData, "status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const destination = await getPrisma().partnerDestination.findUnique({ where: { id: destinationId } });
  if (!destination) redirect("/app/admin/partners?error=Destino no encontrado");

  await getPrisma().partnerDestination.update({
    where: { id: destination.id },
    data: {
      status,
      isDefault: status === "INACTIVE" ? false : destination.isDefault,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/partners");
  redirect("/app/admin/partners?ok=destination-status");
}

export async function setDefaultPartnerDestinationAction(formData: FormData) {
  await requireSuperAdmin();
  const destinationId = field(formData, "destinationId");
  const destination = await getPrisma().partnerDestination.findUnique({ where: { id: destinationId } });
  if (!destination) redirect("/app/admin/partners?error=Destino no encontrado");
  if (destination.status !== "ACTIVE") redirect("/app/admin/partners?error=Solo un destino activo puede ser default");

  await getPrisma().$transaction([
    getPrisma().partnerDestination.updateMany({
      where: { partnerId: destination.partnerId, isDefault: true },
      data: { isDefault: false },
    }),
    getPrisma().partnerDestination.update({
      where: { id: destination.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/partners");
  redirect("/app/admin/partners?ok=default-destination");
}

export async function linkPartnerPortalUserAction(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = field(formData, "partnerId");
  const email = field(formData, "email").toLowerCase();

  if (!email) redirect("/app/admin/partners?error=Email requerido");

  const prisma = getPrisma();
  const [partner, user] = await Promise.all([
    prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true, email: true } }),
  ]);

  if (!partner) redirect("/app/admin/partners?error=Partner no encontrado");
  if (!user) redirect("/app/admin/partners?error=No existe un usuario con ese email. Primero debe crear una cuenta en JAKAWI.");

  const linkedPartner = await prisma.partner.findFirst({
    where: {
      portalUserId: user.id,
      NOT: { id: partner.id },
    },
    select: { name: true },
  });

  if (linkedPartner) redirect(`/app/admin/partners?error=${encodeURIComponent("Ese usuario ya esta vinculado a otro partner.")}`);

  await prisma.partner.update({
    where: { id: partner.id },
    data: { portalUserId: user.id },
  });

  revalidatePath("/app/admin/partners");
  revalidatePath("/app/partner");
  redirect("/app/admin/partners?ok=portal-user");
}

export async function unlinkPartnerPortalUserAction(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = field(formData, "partnerId");
  const partner = await getPrisma().partner.findUnique({ where: { id: partnerId }, select: { id: true } });
  if (!partner) redirect("/app/admin/partners?error=Partner no encontrado");

  await getPrisma().partner.update({
    where: { id: partner.id },
    data: { portalUserId: null },
  });

  revalidatePath("/app/admin/partners");
  revalidatePath("/app/partner");
  redirect("/app/admin/partners?ok=portal-user");
}

const attributionStatusValues = new Set(["SIGNED_UP", "ACTIVE", "PAID", "REWARD_PENDING", "REWARD_APPROVED", "REWARD_APPLIED", "CANCELLED"]);

export async function updateAttributionStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const attributionId = field(formData, "attributionId");
  const status = field(formData, "status");
  if (!attributionStatusValues.has(status)) redirect("/app/admin/referrals?error=Estado invalido");

  const attribution = await getPrisma().acquisitionAttribution.findUnique({ where: { id: attributionId } });
  if (!attribution) redirect("/app/admin/referrals?error=Atribucion no encontrada");

  const now = new Date();
  await getPrisma().acquisitionAttribution.update({
    where: { id: attribution.id },
    data: {
      status,
      notes: cleanOptional(field(formData, "notes")) ?? attribution.notes,
      activatedAt: status === "ACTIVE" && !attribution.activatedAt ? now : attribution.activatedAt,
      paidAt: status === "PAID" && !attribution.paidAt ? now : attribution.paidAt,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/referrals");
  redirect("/app/admin/referrals?ok=status");
}

export async function createPartnerCommissionAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const partnerId = field(formData, "partnerId");
  const storeIdInput = cleanOptional(field(formData, "storeId"));
  const attributionId = cleanOptional(field(formData, "attributionId"));
  const currency = (field(formData, "currency") || "BOB").toUpperCase();
  const basisAmountCents = parseCommissionAmountToCents(formData.get("basisAmount"));
  const commissionAmountCents = parseCommissionAmountToCents(formData.get("commissionAmount"));
  const commissionRateInput = cleanOptional(field(formData, "commissionRateBps"));
  const commissionRateBps = commissionRateInput === null ? null : Number(commissionRateInput);

  if (!/^[A-Z]{3}$/.test(currency)) redirect("/app/admin/commissions?error=Moneda invalida");
  if (!commissionAmountCents || commissionAmountCents <= 0) redirect("/app/admin/commissions?error=Monto de comision invalido");
  if (basisAmountCents !== null && basisAmountCents < 0) redirect("/app/admin/commissions?error=Base de comision invalida");
  if (commissionRateBps !== null && (!Number.isInteger(commissionRateBps) || commissionRateBps < 0 || commissionRateBps > 10000)) {
    redirect("/app/admin/commissions?error=Rate bps invalido");
  }

  const prisma = getPrisma();
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) redirect("/app/admin/commissions?error=Partner no encontrado");

  const attribution = attributionId ? await prisma.acquisitionAttribution.findUnique({ where: { id: attributionId } }) : null;
  if (attributionId && !attribution) redirect("/app/admin/commissions?error=Atribucion no encontrada");
  if (attribution && attribution.partnerId !== partner.id) redirect("/app/admin/commissions?error=La atribucion no pertenece al partner");

  const storeId = storeIdInput ?? attribution?.storeId ?? null;
  if (attribution && storeId && storeId !== attribution.storeId) redirect("/app/admin/commissions?error=La tienda no coincide con la atribucion");
  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) redirect("/app/admin/commissions?error=Tienda no encontrada");
  }

  await prisma.partnerCommission.create({
    data: {
      partnerId: partner.id,
      storeId,
      attributionId: attribution?.id ?? null,
      currency,
      basisAmountCents,
      commissionAmountCents,
      commissionRateBps,
      status: "PENDING",
      description: cleanOptional(field(formData, "description")),
      notes: cleanOptional(field(formData, "notes")),
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/commissions");
  revalidatePath("/app/admin/partners");
  revalidatePath("/app/admin/referrals");
  redirect(`/app/admin/commissions?partnerId=${encodeURIComponent(partner.id)}&ok=created`);
}

export async function updatePartnerCommissionStatusAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const commissionId = field(formData, "commissionId");
  const status = field(formData, "status");
  const returnTo = adminReturnTo(formData, "/app/admin/commissions");
  if (!isPartnerCommissionStatus(status)) redirect(appendQueryParam(returnTo, "error", "Estado invalido"));

  const prisma = getPrisma();
  const commission = await prisma.partnerCommission.findUnique({ where: { id: commissionId } });
  if (!commission) redirect(appendQueryParam(returnTo, "error", "Comision no encontrada"));

  const now = new Date();
  const notes = cleanOptional(field(formData, "notes"));
  const paymentReference = cleanOptional(field(formData, "paymentReference"));

  await prisma.partnerCommission.update({
    where: { id: commission.id },
    data: {
      status,
      notes: notes ?? commission.notes,
      paymentReference: status === "PAID" ? paymentReference ?? commission.paymentReference : commission.paymentReference,
      approvedAt: status === "APPROVED" ? now : commission.approvedAt,
      paidAt: status === "PAID" ? now : commission.paidAt,
      cancelledAt: status === "CANCELLED" ? now : commission.cancelledAt,
      reversedAt: status === "REVERSED" ? now : commission.reversedAt,
      approvedByUserId: status === "APPROVED" ? user.id : commission.approvedByUserId,
      paidByUserId: status === "PAID" ? user.id : commission.paidByUserId,
      cancelledByUserId: status === "CANCELLED" ? user.id : commission.cancelledByUserId,
      reversedByUserId: status === "REVERSED" ? user.id : commission.reversedByUserId,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/commissions");
  revalidatePath("/app/admin/partners");
  redirect(appendQueryParam(returnTo, "ok", "status"));
}

export async function updatePartnerCommissionNotesAction(formData: FormData) {
  await requireSuperAdmin();
  const commissionId = field(formData, "commissionId");
  const returnTo = adminReturnTo(formData, "/app/admin/commissions");
  const commission = await getPrisma().partnerCommission.findUnique({ where: { id: commissionId } });
  if (!commission) redirect(appendQueryParam(returnTo, "error", "Comision no encontrada"));

  await getPrisma().partnerCommission.update({
    where: { id: commission.id },
    data: {
      notes: cleanOptional(field(formData, "notes")),
      paymentReference: cleanOptional(field(formData, "paymentReference")),
    },
  });

  revalidatePath("/app/admin/commissions");
  revalidatePath("/app/admin/partners");
  redirect(appendQueryParam(returnTo, "ok", "notes"));
}

export async function createStoreReferralRewardAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const returnTo = adminReturnTo(formData, "/app/admin/rewards");
  const referrerStoreId = field(formData, "referrerStoreId");
  const referredStoreIdInput = cleanOptional(field(formData, "referredStoreId"));
  const attributionId = cleanOptional(field(formData, "attributionId"));
  const rewardType = field(formData, "rewardType");
  const valueAmountCents = parseRewardAmountToCents(formData.get("valueAmount"));
  const currencyInput = cleanOptional(field(formData, "currency"));
  const currency = currencyInput ? currencyInput.toUpperCase() : null;
  const sellerAiCredits = parseOptionalPositiveInt(formData.get("sellerAiCredits"));
  const months = parseOptionalPositiveInt(formData.get("months"));
  const expiresAt = parseOptionalDate(formData.get("expiresAt"));

  if (!isStoreReferralRewardType(rewardType)) redirect(appendQueryParam(returnTo, "error", "Tipo de beneficio invalido"));
  if (currency && !/^[A-Z]{3}$/.test(currency)) redirect(appendQueryParam(returnTo, "error", "Moneda invalida"));
  if (String(formData.get("valueAmount") ?? "").trim() && valueAmountCents === null) redirect(appendQueryParam(returnTo, "error", "Monto invalido"));
  if (String(formData.get("sellerAiCredits") ?? "").trim() && sellerAiCredits === null) redirect(appendQueryParam(returnTo, "error", "Creditos Seller AI invalidos"));
  if (String(formData.get("months") ?? "").trim() && months === null) redirect(appendQueryParam(returnTo, "error", "Meses invalidos"));
  if (String(formData.get("expiresAt") ?? "").trim() && expiresAt === null) redirect(appendQueryParam(returnTo, "error", "Fecha de expiracion invalida"));

  const prisma = getPrisma();
  const referrerStore = await prisma.store.findUnique({ where: { id: referrerStoreId }, select: { id: true } });
  if (!referrerStore) redirect(appendQueryParam(returnTo, "error", "Tienda referidora no encontrada"));

  const attribution = attributionId ? await prisma.acquisitionAttribution.findUnique({ where: { id: attributionId } }) : null;
  if (attributionId && !attribution) redirect(appendQueryParam(returnTo, "error", "Atribucion no encontrada"));
  if (attribution && attribution.sourceType !== "STORE_REFERRAL") redirect(appendQueryParam(returnTo, "error", "La atribucion no es de tienda referidora"));
  if (attribution && attribution.referrerStoreId !== referrerStore.id) redirect(appendQueryParam(returnTo, "error", "La atribucion no coincide con la tienda referidora"));

  const referredStoreId = referredStoreIdInput ?? attribution?.storeId ?? null;
  if (attribution && referredStoreId && referredStoreId !== attribution.storeId) redirect(appendQueryParam(returnTo, "error", "La tienda referida no coincide con la atribucion"));
  if (referredStoreId) {
    const referredStore = await prisma.store.findUnique({ where: { id: referredStoreId }, select: { id: true } });
    if (!referredStore) redirect(appendQueryParam(returnTo, "error", "Tienda referida no encontrada"));
  }

  const valueLabel = buildRewardValueLabel({
    rewardType,
    valueLabel: cleanOptional(field(formData, "valueLabel")),
    valueAmountCents,
    currency,
    sellerAiCredits,
    months,
  });

  await prisma.storeReferralReward.create({
    data: {
      referrerStoreId: referrerStore.id,
      referredStoreId,
      attributionId: attribution?.id ?? null,
      rewardType,
      valueLabel,
      valueAmountCents,
      currency,
      sellerAiCredits,
      months,
      status: "PENDING",
      description: cleanOptional(field(formData, "description")),
      notes: cleanOptional(field(formData, "notes")),
      expiresAt,
      earnedAt: new Date(),
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/rewards");
  revalidatePath("/app/admin/referrals");
  revalidatePath("/app/referrals");
  redirect(`/app/admin/rewards?referrerStoreId=${encodeURIComponent(referrerStore.id)}&ok=created`);
}

export async function updateStoreReferralRewardStatusAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const rewardId = field(formData, "rewardId");
  const status = field(formData, "status");
  const returnTo = adminReturnTo(formData, "/app/admin/rewards");
  if (!isStoreReferralRewardStatus(status)) redirect(appendQueryParam(returnTo, "error", "Estado invalido"));

  const prisma = getPrisma();
  const reward = await prisma.storeReferralReward.findUnique({ where: { id: rewardId } });
  if (!reward) redirect(appendQueryParam(returnTo, "error", "Recompensa no encontrada"));

  const now = new Date();
  const notes = cleanOptional(field(formData, "notes"));
  const applicationReference = cleanOptional(field(formData, "applicationReference"));

  await prisma.storeReferralReward.update({
    where: { id: reward.id },
    data: {
      status,
      notes: notes ?? reward.notes,
      applicationReference: status === "APPLIED" ? applicationReference ?? reward.applicationReference : reward.applicationReference,
      approvedAt: status === "APPROVED" ? now : reward.approvedAt,
      appliedAt: status === "APPLIED" ? now : reward.appliedAt,
      cancelledAt: status === "CANCELLED" ? now : reward.cancelledAt,
      approvedByUserId: status === "APPROVED" ? user.id : reward.approvedByUserId,
      appliedByUserId: status === "APPLIED" ? user.id : reward.appliedByUserId,
      cancelledByUserId: status === "CANCELLED" ? user.id : reward.cancelledByUserId,
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app/admin/rewards");
  revalidatePath("/app/admin/referrals");
  revalidatePath("/app/referrals");
  redirect(appendQueryParam(returnTo, "ok", "status"));
}

export async function updateStoreReferralRewardNotesAction(formData: FormData) {
  await requireSuperAdmin();
  const rewardId = field(formData, "rewardId");
  const returnTo = adminReturnTo(formData, "/app/admin/rewards");
  const reward = await getPrisma().storeReferralReward.findUnique({ where: { id: rewardId } });
  if (!reward) redirect(appendQueryParam(returnTo, "error", "Recompensa no encontrada"));

  await getPrisma().storeReferralReward.update({
    where: { id: reward.id },
    data: {
      notes: cleanOptional(field(formData, "notes")),
      applicationReference: cleanOptional(field(formData, "applicationReference")),
    },
  });

  revalidatePath("/app/admin/rewards");
  revalidatePath("/app/referrals");
  redirect(appendQueryParam(returnTo, "ok", "notes"));
}

export async function ensureUserHasStore() {
  const user = await requireUser();
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });
  if (!store) redirect("/app/tienda");
  return { user, store };
}
