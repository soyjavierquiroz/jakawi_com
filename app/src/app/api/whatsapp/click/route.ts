import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.redirect(new URL("/", request.url));

  const product = await getPrisma().product.findUnique({
    where: { id: productId },
    include: { store: true },
  });

  if (!product || !product.isVisible || !product.store.isPublished) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await trackEvent("WHATSAPP_CLICK", product.storeId, product.id);

  const phone = normalizePhone(product.store.whatsapp);
  const message = `Hola, vi este producto en tu tienda JAKAWI: ${product.name}. Sigue disponible?`;
  return NextResponse.redirect(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
}
