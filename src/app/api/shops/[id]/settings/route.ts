import { NextRequest, NextResponse } from "next/server";
import { getShop, getQueueSettings, updateQueueSettings } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const settings = getQueueSettings(id);
  return NextResponse.json({ settings });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const settings = updateQueueSettings(id, body);
  return NextResponse.json({ settings });
}
