import { NextRequest, NextResponse } from "next/server";
import {
  getBookingSlots,
  createBookingSlot,
  deleteBookingSlot,
  getShop,
  ensureMigrated,
} from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import { requireOwner } from "@/lib/auth";

// GET is public (customers need to see available slots)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureMigrated();
    const { id } = await params;

    const shop = await getShop(id);
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const slots = await getBookingSlots(id);
    return NextResponse.json({ slots });
  } catch (e: any) {
    console.error("GET booking-slots error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

// POST requires shop owner password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    if (!body.dayOfWeek && body.dayOfWeek !== 0) {
      return NextResponse.json(
        { error: "dayOfWeek is required" },
        { status: 400 },
      );
    }
    if (!body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 },
      );
    }

    const slot = await createBookingSlot({
      shopId: id,
      dayOfWeek: body.dayOfWeek as number,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (e: any) {
    console.error("POST booking-slots error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
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

  const url = new URL(req.url);
  const slotId = url.searchParams.get("slotId");

  const auth = await requireOwner(req, shop);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!slotId) {
    return NextResponse.json(
      { error: "slotId is required" },
      { status: 400 },
    );
  }

  await deleteBookingSlot(slotId);
  return NextResponse.json({ success: true });
}
