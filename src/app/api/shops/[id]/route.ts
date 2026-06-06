import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, sanitizeShop } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  const body = await req.json();
  const shopRaw = await updateShop(id, body);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);
  return NextResponse.json({ shop });
}
