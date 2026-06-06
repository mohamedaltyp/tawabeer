import { NextRequest, NextResponse } from "next/server";
import { getAppSetting, setAppSetting } from "@/lib/db";

const ADMIN_TOKEN = "dawer-admin-2026";

export async function GET() {
  return NextResponse.json({
    admin_whatsapp: getAppSetting("admin_whatsapp"),
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (body.admin_whatsapp !== undefined) {
    setAppSetting("admin_whatsapp", body.admin_whatsapp);
  }
  return NextResponse.json({
    success: true,
    admin_whatsapp: getAppSetting("admin_whatsapp"),
  });
}
