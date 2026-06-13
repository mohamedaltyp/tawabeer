import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, sanitizeShop, sanitizeText, ensureMigrated } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
  const shopRaw = await getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);
  // Defense-in-depth: explicitly remove owner_password in case sanitizeShop is ever bypassed
  delete (shop as any).owner_password;

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

  const shopRaw = await getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Auth: session cookie (preferred) or legacy owner password
  const auth = await requireOwner(req, shopRaw, body.owner_password);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Remove owner_password from update data
  delete body.owner_password;
  const updateData = body;
  
  // Sanitize text fields
  if (updateData.name) updateData.name = sanitizeText(updateData.name);
  if (updateData.description) updateData.description = sanitizeText(updateData.description);
  
  const updated = await updateShop(id, updateData);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  const shop = sanitizeShop(updated);
  // Defense-in-depth: explicitly remove owner_password in case sanitizeShop is ever bypassed
  delete (shop as any).owner_password;
  return NextResponse.json({ shop });
}
