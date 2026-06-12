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
    whatsapp_business_account_id: settings?.whatsapp_business_account_id || "",
    whatsapp_access_token: settings?.whatsapp_access_token ? "••••••" + settings.whatsapp_access_token.slice(-4) : "",
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
  const { whatsapp_enabled, whatsapp_number, whatsapp_business_account_id, whatsapp_access_token } = body;

  // WhatsApp ميزة مدفوعة — متاحة فقط للباقات basic+
  if (whatsapp_enabled && shop.plan === "free") {
    return NextResponse.json(
      {
        error: "إشعارات واتساب متاحة فقط للباقات المدفوعة. رقي باقتك أولاً.",
        code: "plan_upgrade_required",
        upgradeUrl: "/dashboard/pricing",
      },
      { status: 403 }
    );
  }

  // Validate: if enabling, need at least a phone number
  if (whatsapp_enabled && (!whatsapp_number || whatsapp_number.trim() === "")) {
    return NextResponse.json(
      { error: "أدخل رقم الواتساب الأول" },
      { status: 400 }
    );
  }

  // Build update object — only update provided fields
  const updates: Record<string, any> = {};
  if (whatsapp_enabled !== undefined) updates.whatsapp_enabled = whatsapp_enabled ? 1 : 0;
  if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number;
  if (whatsapp_business_account_id !== undefined) updates.whatsapp_business_account_id = whatsapp_business_account_id;
  if (whatsapp_access_token !== undefined && whatsapp_access_token !== "" && !whatsapp_access_token.startsWith("•••")) {
    updates.whatsapp_access_token = whatsapp_access_token;
  }

  const updated = await updateQueueSettings(id, updates);

  return NextResponse.json({ settings: updated });
}
