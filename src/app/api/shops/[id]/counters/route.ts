import { NextRequest, NextResponse } from "next/server";
import { getShop, getCounters, createCounter, deleteCounter } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const counters = await getCounters(id);
  return NextResponse.json({ counters });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const body = await req.json();
  const name = body.name?.trim() || `شباك جديد`;
  const counter = await createCounter(id, name);
  return NextResponse.json({ counter }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const counterId = searchParams.get("counterId");
  if (!counterId) return NextResponse.json({ error: "counterId required" }, { status: 400 });

  await deleteCounter(counterId);
  return NextResponse.json({ success: true });
}
