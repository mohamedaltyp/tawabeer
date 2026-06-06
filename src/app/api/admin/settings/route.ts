     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getAppSetting, setAppSetting } from "@/lib/db";
     3|
     4|const ADMIN_TOKEN = "dawer-admin-2026";
     5|
     6|export async function GET() {
     7|  return NextResponse.json({
     8|    admin_whatsapp: await getAppSetting("admin_whatsapp"),
     9|  });
    10|}
    11|
    12|export async function PUT(req: NextRequest) {
    13|  const body = await req.json();
    14|  if (body.adminToken !== ADMIN_TOKEN) {
    15|    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    16|  }
    17|  if (body.admin_whatsapp !== undefined) {
    18|    await setAppSetting("admin_whatsapp", body.admin_whatsapp);
    19|  }
    20|  return NextResponse.json({
    21|    success: true,
    22|    admin_whatsapp: await getAppSetting("admin_whatsapp"),
    23|  });
    24|}
    25|