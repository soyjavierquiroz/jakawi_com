import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { sendQaCrmWebhookTestEvent } from "@/lib/crm-webhook";

export async function POST() {
  await requireSuperAdmin();
  const result = await sendQaCrmWebhookTestEvent();
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
