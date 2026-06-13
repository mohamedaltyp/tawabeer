import { NextRequest, NextResponse } from "next/server";
import {
  getActiveQueue,
  joinQueue,
  callNext,
  completeEntry,
  cancelEntry,
  callAgain,
  getShop,
  getTodayCustomerCount,
  getQueueSettings,
  ensureMigrated,
} from "@/lib/db";
import { canAcceptCustomer, getPlanLimits } from "@/lib/plans";
import { requireOwner } from "@/lib/auth";

// GET queue for a shop
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const queue = await getActiveQueue(id);
  return NextResponse.json({ queue });
}

// POST - Join queue
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureMigrated();
    const { id } = await params;
    const shop = await getShop(id);
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    // ── Closed Mode check ──
    const settings = await getQueueSettings(id);
    if (settings && settings.is_open === 0) {
      return NextResponse.json(
        {
          error: "المحل مغلق حالياً. لا يمكن حجز أدوار جديدة.",
          code: "shop_closed",
        },
        { status: 403 }
      );
    }

    // ── Plan enforcement: check daily customer limit ──
    const shopPlan = shop.plan || "free";
    const todayCount = await getTodayCustomerCount(id);
    if (!canAcceptCustomer(shopPlan, todayCount)) {
      const limits = getPlanLimits(shopPlan);
      return NextResponse.json(
        {
          error: `المحل وصل للحد الأقصى من الزبائن اليوم (${limits.maxDailyCustomers}). جرب بكرة أو رقي الباقة.`,
          code: "daily_limit_reached",
          upgradeUrl: "/dashboard/pricing",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    // Sanitize customer input
    if (body.customerName) body.customerName = body.customerName.replace(/[<>&\"']/g, "").trim();
    if (body.customerPhone) body.customerPhone = body.customerPhone.replace(/[^0-9+\- ]/g, "").trim();
    const result = await joinQueue({ shopId: id, ...body });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    console.error("POST queue error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// PATCH - Manage queue (call next, complete, cancel, call again)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;

  const shop = await getShop(id);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const body = await req.json();
  const auth = await requireOwner(req, shop, body.owner_password);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let result;
  switch (body.action) {
    case "call-next":
      result = await callNext(id, body.counterId);
      break;
    case "complete":
      result = await completeEntry(body.entryId);
      break;
    case "cancel":
      result = await cancelEntry(body.entryId);
      break;
    case "call-again":
      result = await callAgain(body.entryId);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!result) return NextResponse.json({ error: "No waiting entries" }, { status: 404 });
  return NextResponse.json({ entry: result });
}
