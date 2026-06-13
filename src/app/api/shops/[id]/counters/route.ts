import { NextRequest, NextResponse } from "next/server";
import {
  getShop,
  getCounters,
  createCounter,
  deleteCounter,
  ensureMigrated,
} from "@/lib/db";
import { isOwnerPasswordValid } from "@/lib/auth";

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

  // Verify owner password
  const headerPassword = req.headers.get("x-owner-password");
  let body: Record<string, unknown> = {};

  try {
    const parsed = await req.json();
    body = parsed;
  } catch {
    // No body
  }

  const password = headerPassword || (body.owner_password as string);
  if (!password || !(await isOwnerPasswordValid(password, shop.id, shop.owner_phone || ""))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

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

  // Verify owner password (from header or query param for DELETE)
  const headerPassword = req.headers.get("x-owner-password");
  const { searchParams } = new URL(req.url);
  const queryPassword = searchParams.get("owner_password");
  const counterId = searchParams.get("counterId");

  const password = headerPassword || queryPassword;
  if (!password || !(await isOwnerPasswordValid(password, shop.id, shop.owner_phone || ""))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (!counterId)
    return NextResponse.json(
      { error: "counterId required" },
      { status: 400 },
    );

  await deleteCounter(counterId);
  return NextResponse.json({ success: true });
}
