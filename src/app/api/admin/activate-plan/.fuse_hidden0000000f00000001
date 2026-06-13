import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShopPlan } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 20 req/min

function verifyAdmin(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";
  return token === adminPassword;
}

// Simple admin activation — بعد تأكيد استلام الدفع يدوياً
export async function POST(req: NextRequest) {
  // Rate limiting
  const { allowed, remaining, resetAt } = limiter.check(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  // Admin auth
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { shopId, plan, expiresAt } = body;

    const shop = await getShop(shopId);
    if (!shop) {
      return NextResponse.json({ error: "المحل غير موجود" }, { status: 404 });
    }

    const validPlans = ["basic", "pro", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "باقة غير صالحة" }, { status: 400 });
    }

    const updated = await updateShopPlan(shopId, plan, expiresAt);

    return NextResponse.json({
      success: true,
      message: `تم تفعيل باقة ${plan} للمحل ${shop.name}`,
      shop: updated,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
