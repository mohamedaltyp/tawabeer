import { NextRequest, NextResponse } from "next/server";
import {
  getActiveQueue,
  joinQueue,
  callNext,
  completeEntry,
  cancelEntry,
  callAgain,
  getShop,
  emitShopEvent,
} from "@/lib/db";

// GET queue for a shop
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const queue = getActiveQueue(id);
  return NextResponse.json({ queue });
}

// POST - Join queue
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const body = await req.json();
  const result = joinQueue({ shopId: id, ...body });

  emitShopEvent(id, "queue-update", { action: "join", entry: result.entry });

  return NextResponse.json(result, { status: 201 });
}

// PATCH - Manage queue (call next, complete, cancel, call again)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  let result;
  switch (body.action) {
    case "call-next":
      result = callNext(id);
      if (result) emitShopEvent(id, "queue-update", { action: "called", entry: result });
      break;
    case "complete":
      result = completeEntry(body.entryId);
      if (result) emitShopEvent(id, "queue-update", { action: "completed", entry: result });
      break;
    case "cancel":
      result = cancelEntry(body.entryId);
      if (result) emitShopEvent(id, "queue-update", { action: "cancelled", entry: result });
      break;
    case "call-again":
      result = callAgain(body.entryId);
      if (result) emitShopEvent(id, "queue-update", { action: "called", entry: result });
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!result) return NextResponse.json({ error: "No waiting entries" }, { status: 404 });
  return NextResponse.json({ entry: result });
}
