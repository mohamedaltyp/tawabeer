     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getShop, getQueueStats } from "@/lib/db";
     3|
     4|export async function GET(
     5|  req: NextRequest,
     6|  { params }: { params: Promise<{ id: string }> }
     7|) {
     8|  const { id } = await params;
     9|  const shop = await getShop(id);
    10|  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    11|
    12|  const stats = await getQueueStats(id);
    13|  return NextResponse.json({ stats });
    14|}
    15|