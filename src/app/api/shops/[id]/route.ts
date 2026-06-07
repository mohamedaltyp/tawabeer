import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, sanitizeShop, sanitizeText, ensureMigrated } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
  const shopRaw = await getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);

  const settings = await getQueueSettings(id);
  const stats = await getQueueStats(id);
  const queue = await getActiveQueue(id);
  const allQueue = await getQueueEntries(id);

  return NextResponse.json({ shop, settings, stats, queue, allQueue });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json();
  
  // Auth: require owner_password or admin password
  if (!body.owner_password) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const shopRaw = await getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  
  const isAdmin = body.owner_password === (process.env.ADMIN_PASSWORD || "dawer-admin-2026");
  if (!isAdmin && shopRaw.owner_password !== body.owner_password) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }
  
  // Remove owner_password from update data
  const { owner_password, ...updateData } = body;
  
  // Sanitize text fields
  if (updateData.name) updateData.name = sanitizeText(updateData.name);
  if (updateData.description) updateData.description = sanitizeText(updateData.description);
  
  const updated = await updateShop(id, updateData);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  const shop = sanitizeShop(updated);
  return NextResponse.json({ shop });
}
