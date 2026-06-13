import { NextRequest, NextResponse } from "next/server";
import {
  getShop,
  getCounters,
  createCounter,
  deleteCounter,
  ensureMigrated,
} from "@/lib/db";
import { requireOwner } from "@/lib/auth";

// GET is public (customers need to see counters)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const counters = await getCounters(id);
  return NextResponse.json({ counters });
}

// POST requires shop owner password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // No body
  }

  const auth = await requireOwner(req, shop, body.owner_password as string | undefined);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const name = (body.name as string)?.trim() || `شباك جديد`;
  const counter = await createCounter(id, name);
  return NextResponse.json({ counter }, { status: 201 });
}

// DELETE requires shop owner password
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const counterId = searchParams.get("counterId");

  const auth = await requireOwner(req, shop);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!counterId)
    return NextResponse.json(
      { error: "counterId required" },
      { status: 400 },
    );

  await deleteCounter(counterId);
  return NextResponse.json({ success: true });
}
