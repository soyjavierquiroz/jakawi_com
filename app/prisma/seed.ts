import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("DemoJAKAWI2026!", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@jakawi.com" },
    update: {
      name: "Javier Quiroz",
      firstName: "Javier",
      lastName: "Quiroz",
      phone: "+59179790873",
      countryCode: "BO",
      countryName: "Bolivia",
      city: "La Paz",
      passwordHash,
    },
    create: {
      name: "Javier Quiroz",
      firstName: "Javier",
      lastName: "Quiroz",
      email: "demo@jakawi.com",
      phone: "+59179790873",
      countryCode: "BO",
      countryName: "Bolivia",
      city: "La Paz",
      passwordHash,
    },
  });

  const store = await prisma.store.upsert({
    where: { slug: "megalon" },
    update: {
      ownerId: user.id,
      name: "Megalon",
      whatsapp: "+59179790873",
      countryCode: "BO",
      countryName: "Bolivia",
      city: "La Paz",
      instagram: "megalosn",
      tiktok: "megalons",
      description: "Tienda demo creada con JAKAWI.",
      plan: "PRO",
    },
    create: {
      ownerId: user.id,
      name: "Megalon",
      slug: "megalon",
      whatsapp: "+59179790873",
      countryCode: "BO",
      countryName: "Bolivia",
      city: "La Paz",
      instagram: "megalosn",
      tiktok: "megalons",
      description: "Tienda demo creada con JAKAWI.",
      plan: "PRO",
    },
  });

  const category = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "celulares" } },
    update: { name: "Celulares" },
    create: { storeId: store.id, name: "Celulares", slug: "celulares" },
  });

  await prisma.product.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "celular-demo" } },
    update: {
      categoryId: category.id,
      name: "Celular demo",
      priceCents: 49999,
      currency: "BOB",
      description: "Celular de prueba para validar el flujo de consulta por WhatsApp.",
      imageUrl: "/placeholder-product.svg",
      isVisible: true,
    },
    create: {
      storeId: store.id,
      categoryId: category.id,
      name: "Celular demo",
      slug: "celular-demo",
      priceCents: 49999,
      currency: "BOB",
      description: "Celular de prueba para validar el flujo de consulta por WhatsApp.",
      imageUrl: "/placeholder-product.svg",
      isVisible: true,
    },
  });

  const accessories = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "accesorios" } },
    update: { name: "Accesorios" },
    create: { storeId: store.id, name: "Accesorios", slug: "accesorios" },
  });

  const demoProducts = [
    {
      slug: "mochila-urbana",
      name: "Mochila urbana",
      priceCents: 18900,
      description: "Mochila practica para trabajo, estudio y uso diario.",
    },
    {
      slug: "audifonos-bluetooth",
      name: "Audífonos bluetooth",
      priceCents: 15900,
      description: "Audifonos bluetooth para llamadas, musica y uso diario.",
    },
    {
      slug: "termo-para-oficina",
      name: "Termo para oficina",
      priceCents: 9900,
      description: "Termo compacto para llevar bebidas al trabajo o estudio.",
    },
  ];

  for (const product of demoProducts) {
    await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug: product.slug } },
      update: {
        categoryId: accessories.id,
        name: product.name,
        priceCents: product.priceCents,
        currency: "BOB",
        description: product.description,
        imageUrl: "/placeholder-product.svg",
        isVisible: true,
      },
      create: {
        storeId: store.id,
        categoryId: accessories.id,
        name: product.name,
        slug: product.slug,
        priceCents: product.priceCents,
        currency: "BOB",
        description: product.description,
        imageUrl: "/placeholder-product.svg",
        isVisible: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
