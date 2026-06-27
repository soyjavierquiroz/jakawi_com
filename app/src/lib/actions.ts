"use server";

import { Prisma } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { registrationConfig } from "@/config/registration";
import { createSession, destroySession, hashPassword, requireStore, requireUser, verifyPassword } from "@/lib/auth";
import { makeSlug, normalizePhone, priceToCents } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { isValidStoreSlug, slugifyStoreName } from "@/lib/slug";
import { uploadImage } from "@/lib/storage";
import { getVisitorInfoFromHeaders, hashIp } from "@/lib/visitor";

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

async function uniqueStoreSlug(input: string, currentStoreId?: string) {
  const base = slugifyStoreName(input);
  if (!base || !isValidStoreSlug(base)) throw new Error("Ese link no esta disponible.");

  const existing = await getPrisma().store.findUnique({ where: { slug: base } });
  if (existing && existing.id !== currentStoreId) throw new Error("Ese link ya esta en uso.");
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
    countryCode: z.string().min(2).max(2).optional().or(z.literal("")),
    countryName: z.string().max(80).optional().or(z.literal("")),
    city: z.string().max(80).optional().or(z.literal("")),
    region: z.string().max(80).optional().or(z.literal("")),
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
    city: field(formData, "city"),
    region: field(formData, "region"),
  });

  if (!parsed.success) {
    redirect("/registro?error=Revisa los datos del formulario");
  }

  const requestHeaders = await headers();
  const visitor = getVisitorInfoFromHeaders(requestHeaders);
  const slug = await uniqueStoreSlug(parsed.data.storeSlug).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Ese link no esta disponible.";
    redirect(`/registro?error=${encodeURIComponent(message)}`);
  });
  const passwordHash = await hashPassword(parsed.data.password);
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const name = `${firstName} ${lastName}`.trim();
  const countryCode = cleanOptional(parsed.data.countryCode) ?? visitor.countryCode;
  const countryName = cleanOptional(parsed.data.countryName) ?? visitor.countryName;
  const city = cleanOptional(parsed.data.city) ?? visitor.city;
  const region = cleanOptional(parsed.data.region) ?? visitor.region;
  const ipHash = visitor.ip ? hashIp(visitor.ip) : null;

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
            city,
            region,
            description: "Mi tienda creada con JAKAWI.",
            isPublished: true,
          },
        },
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/registro?error=Este email o link ya esta registrado");
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

export async function updateStoreAction(formData: FormData) {
  const { store } = await requireStore();
  const name = field(formData, "name");
  const slug = await uniqueStoreSlug(field(formData, "slug"), store.id);
  const cover = formData.get("cover");
  const logo = formData.get("logo");

  const coverUrl = cover instanceof File ? await uploadImage(cover, `stores/${store.id}/cover`) : null;
  const logoUrl = logo instanceof File ? await uploadImage(logo, `stores/${store.id}/logo`) : null;

  await getPrisma().store.update({
    where: { id: store.id },
    data: {
      name,
      slug,
      description: cleanOptional(field(formData, "description")),
      whatsapp: normalizePhone(field(formData, "whatsapp")),
      instagram: cleanOptional(field(formData, "instagram")),
      tiktok: cleanOptional(field(formData, "tiktok")),
      ...(coverUrl ? { coverUrl } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/tienda");
  revalidatePath(`/${slug}`);
  redirect("/app/tienda?ok=1");
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

  if (productId) {
    const imageUrl = image instanceof File ? await uploadImage(image, `stores/${store.id}/products/${productId}`) : null;
    await getPrisma().product.update({
      where: { id: productId, storeId: store.id },
      data: {
        name,
        slug,
        description: cleanOptional(field(formData, "description")),
        priceCents: priceToCents(formData.get("price")),
        categoryId,
        isVisible,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
  } else {
    const product = await getPrisma().product.create({
      data: {
        storeId: store.id,
        categoryId,
        name,
        slug,
        description: cleanOptional(field(formData, "description")),
        priceCents: priceToCents(formData.get("price")),
        isVisible,
      },
    });
    const imageUrl = image instanceof File ? await uploadImage(image, `stores/${store.id}/products/${product.id}`) : null;
    if (imageUrl) {
      await getPrisma().product.update({ where: { id: product.id }, data: { imageUrl } });
    }
  }

  revalidatePath("/app/productos");
  revalidatePath(`/${store.slug}`);
  redirect("/app/productos");
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

export async function ensureUserHasStore() {
  const user = await requireUser();
  const store = await getPrisma().store.findFirst({ where: { ownerId: user.id } });
  if (!store) redirect("/app/tienda");
  return { user, store };
}
