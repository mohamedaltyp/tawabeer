import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, updateQueueSettings, sanitizeShop } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shopRaw = getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);

  const settings = getQueueSettings(id);
  const stats = getQueueStats(id);
  const queue = getActiveQueue(id);
  const allQueue = getQueueEntries(id);

  return NextResponse.json({ shop, settings, stats, queue, allQueue });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const shopRaw = updateShop(id, body);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);
  return NextResponse.json({ shop });
}
