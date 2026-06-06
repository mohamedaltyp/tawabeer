import { NextRequest, NextResponse } from "next/server";
import { getShop, updateShopPlan } from "@/lib/db";

// Simple admin activation — بعد تأكيد استلام الدفع يدوياً
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminToken, shopId, plan, expiresAt } = body;

    // Admin token — مقروء من متغير البيئة
    const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";
    if (adminToken !== adminPassword) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

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
