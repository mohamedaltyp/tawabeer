import { NextRequest, NextResponse } from "next/server";
import { getShop, getQueueSettings, updateQueueSettings } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const settings = await getQueueSettings(id);
  return NextResponse.json({
    whatsapp_enabled: settings?.whatsapp_enabled || 0,
    whatsapp_number: settings?.whatsapp_number || "",
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const body = await req.json();
  const { whatsapp_enabled, whatsapp_number } = body;

  // Validate: if enabling, need a phone number
  if (whatsapp_enabled && (!whatsapp_number || whatsapp_number.trim() === "")) {
    return NextResponse.json(
      { error: "أدخل رقم الواتساب الأول" },
      { status: 400 }
    );
  }

  const updated = await updateQueueSettings(id, {
    whatsapp_enabled: whatsapp_enabled ? 1 : 0,
    whatsapp_number: whatsapp_number || "",
  });

  return NextResponse.json({ settings: updated });
}
