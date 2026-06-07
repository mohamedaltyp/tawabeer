import { NextRequest, NextResponse } from "next/server";
import {
  getBookingSlots,
  createBookingSlot,
  deleteBookingSlot,
  getShop,
  ensureMigrated,
} from "@/lib/db";

// GET - Get all booking slots for a shop
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;

  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const slots = await getBookingSlots(id);
  return NextResponse.json({ slots });
}

// POST - Create a booking slot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureMigrated();
    const { id } = await params;
    const body = await req.json();

    if (!body.dayOfWeek && body.dayOfWeek !== 0) {
      return NextResponse.json({ error: "dayOfWeek is required" }, { status: 400 });
    }
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
    }

    const slot = await createBookingSlot({
      shopId: id,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (e: any) {
    console.error("POST booking-slots error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// DELETE - Delete a booking slot
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const url = new URL(req.url);
  const slotId = url.searchParams.get("slotId");

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  await deleteBookingSlot(slotId);
  return NextResponse.json({ success: true });
}
