import { NextRequest, NextResponse } from "next/server";
import { getShop, getQueueStats } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const stats = await getQueueStats(id);
  return NextResponse.json({ stats });
}
