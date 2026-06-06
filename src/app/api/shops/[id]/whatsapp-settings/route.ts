     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getShop, getQueueSettings, updateQueueSettings } from "@/lib/db";
     3|
     4|export async function GET(
     5|  req: NextRequest,
     6|  { params }: { params: Promise<{ id: string }> }
     7|) {
     8|  const { id } = await params;
     9|  const shop = await getShop(id);
    10|  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    11|
    12|  const settings = await getQueueSettings(id);
    13|  return NextResponse.json({
    14|    whatsapp_enabled: settings?.whatsapp_enabled || 0,
    15|    whatsapp_number: settings?.whatsapp_number || "",
    16|  });
    17|}
    18|
    19|export async function PATCH(
    20|  req: NextRequest,
    21|  { params }: { params: Promise<{ id: string }> }
    22|) {
    23|  const { id } = await params;
    24|  const shop = await getShop(id);
    25|  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    26|
    27|  const body = await req.json();
    28|  const { whatsapp_enabled, whatsapp_number } = body;
    29|
    30|  // WhatsApp ميزة مدفوعة — متاحة فقط للباقات basic+
    31|  if (whatsapp_enabled && shop.plan === "free") {
    32|    return NextResponse.json(
    33|      {
    34|        error: "إشعارات واتساب متاحة فقط للباقات المدفوعة. رقي باقتك أولاً.",
    35|        code: "plan_upgrade_required",
    36|        upgradeUrl: "/dashboard/pricing",
    37|      },
    38|      { status: 403 }
    39|    );
    40|  }
    41|
    42|  const updated = await updateQueueSettings(id, {
    43|    whatsapp_enabled: whatsapp_enabled ? 1 : 0,
    44|    whatsapp_number: whatsapp_number || "",
    45|  });
    46|
    47|  return NextResponse.json({ settings: updated });
    48|}
    49|