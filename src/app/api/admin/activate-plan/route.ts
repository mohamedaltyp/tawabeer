     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getShop, updateShopPlan } from "@/lib/db";
     3|
     4|// Simple admin activation — بعد تأكيد استلام الدفع يدوياً
     5|export async function POST(req: NextRequest) {
     6|  try {
     7|    const body = await req.json();
     8|    const { adminToken, shopId, plan, expiresAt } = body;
     9|
    10|    // Admin token — مقروء من متغير البيئة
    11|    const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";
    12|    if (adminToken !== adminPassword) {
    13|      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    14|    }
    15|
    16|    const shop = await getShop(shopId);
    17|    if (!shop) {
    18|      return NextResponse.json({ error: "المحل غير موجود" }, { status: 404 });
    19|    }
    20|
    21|    const validPlans = ["basic", "pro", "enterprise"];
    22|    if (!validPlans.includes(plan)) {
    23|      return NextResponse.json({ error: "باقة غير صالحة" }, { status: 400 });
    24|    }
    25|
    26|    const updated = await updateShopPlan(shopId, plan, expiresAt);
    27|
    28|    return NextResponse.json({
    29|      success: true,
    30|      message: `تم تفعيل باقة ${plan} للمحل ${shop.name}`,
    31|      shop: updated,
    32|    });
    33|  } catch (e: any) {
    34|    return NextResponse.json({ error: e.message }, { status: 500 });
    35|  }
    36|}
    37|