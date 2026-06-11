import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableSlots,
  createBooking,
  getShopBookings,
  cancelBooking,
  completeBooking,
  getBookingStats,
  getShop,
  getQueueSettings,
  ensureMigrated,
} from "@/lib/db";
import { comparePassword } from "@/lib/auth";

// GET is public (customers need to see available slots and make bookings)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const action = url.searchParams.get("action");

  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Get stats
  if (action === "stats") {
    const stats = await getBookingStats(id);
    return NextResponse.json({ stats });
  }

  // Get available slots for a specific date
  if (date) {
    const slots = await getAvailableSlots(id, date);
    return NextResponse.json({ slots, date });
  }

  // Get all upcoming bookings for this shop (owner view)
  const bookings = await getShopBookings(id);
  const stats = await getBookingStats(id);
  return NextResponse.json({ bookings, stats });
}

// POST - Create a booking (public — customers book without auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureMigrated();
    const { id } = await params;

    const body = await req.json();

    // Sanitize inputs
    if (body.customerName)
      body.customerName = body.customerName
        .replace(/[<>&"']/g, "")
        .trim();
    if (body.customerPhone)
      body.customerPhone = body.customerPhone
        .replace(/[^0-9+\- ]/g, "")
        .trim();

    const result = await createBooking({
      shopId: id,
      slotId: body.slotId,
      bookingDate: body.bookingDate,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      notes: body.notes,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    console.error("POST bookings error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

// PATCH - Cancel or complete a booking (requires owner auth)
export async function PATCH(
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
  if (!password || !shop.owner_password || !(await comparePassword(password, shop.owner_password))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let result;
  switch (body.action) {
    case "cancel":
      result = await cancelBooking(body.bookingId as string);
      break;
    case "complete":
      result = await completeBooking(body.bookingId as string);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!result)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking: result });
}
