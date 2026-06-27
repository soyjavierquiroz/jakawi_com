import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "jakawi.com",
      timestamp: new Date().toISOString(),
      database: "ok",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "jakawi.com",
        timestamp: new Date().toISOString(),
        database: "error",
      },
      { status: 500 },
    );
  }
}
