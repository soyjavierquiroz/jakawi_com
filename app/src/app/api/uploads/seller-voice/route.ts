import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStore } from "@/lib/auth";
import { uploadAudio, uploadImage } from "@/lib/storage";

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
    const publicUrl =
      parsed.data.type === "avatar"
        ? await uploadImage(file, `stores/${store.id}/seller-voice/avatar`)
        : await uploadAudio(file, `stores/${store.id}/seller-voice/${parsed.data.type}`);

    return NextResponse.json({ ok: true, publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
