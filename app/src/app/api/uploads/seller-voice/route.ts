import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPolicies } from "@/config/rate-limits";
import { requireStore } from "@/lib/auth";
import { checkRateLimit, getClientIpFromHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { uploadOptimizedImage, uploadSellerVoiceAudio } from "@/lib/storage";

const uploadSchema = z.object({
  type: z.enum(["intro", "guidance", "handoff", "avatar"]),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, store } = await requireStore();
  const [storeLimit, ipLimit] = await Promise.all([
    checkRateLimit({ policy: rateLimitPolicies.SELLER_VOICE_UPLOAD, keyParts: [user.id, store.id] }),
    checkRateLimit({ policy: rateLimitPolicies.SELLER_VOICE_UPLOAD_IP, keyParts: [getClientIpFromHeaders(request.headers)] }),
  ]);
  if (!storeLimit.allowed) return rateLimitResponse(storeLimit);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });

  const parsed = uploadSchema.safeParse({
    type: String(formData.get("type") ?? ""),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid upload type" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });
  }

  try {
    if (parsed.data.type === "avatar") {
      const uploaded = await uploadOptimizedImage(file, { type: "SELLER_AVATAR", storeId: store.id });
      if (!uploaded) return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });
      return NextResponse.json({
        ok: true,
        url: uploaded.url,
        publicUrl: uploaded.url,
        key: uploaded.key,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        width: uploaded.width,
        height: uploaded.height,
        optimized: uploaded.optimized === true,
        originalMimeType: uploaded.originalMimeType,
        originalSize: uploaded.originalSize,
      });
    }

    const uploaded = await uploadSellerVoiceAudio(file, store.id, parsed.data.type);
    if (!uploaded) return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      publicUrl: uploaded.url,
      key: uploaded.key,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      durationSeconds: uploaded.durationSeconds,
      optimized: uploaded.optimized === true,
      originalMimeType: uploaded.originalMimeType,
      originalSize: uploaded.originalSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
