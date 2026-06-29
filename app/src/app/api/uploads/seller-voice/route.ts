import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStore } from "@/lib/auth";
import { uploadImage, uploadSellerVoiceAudio } from "@/lib/storage";

const uploadSchema = z.object({
  type: z.enum(["intro", "guidance", "handoff", "avatar"]),
});

export async function POST(request: Request) {
  const { store } = await requireStore();
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
      const url = await uploadImage(file, `stores/${store.id}/seller-voice/avatar`);
      return NextResponse.json({ ok: true, url, publicUrl: url, key: null, mimeType: file.type, size: file.size });
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
