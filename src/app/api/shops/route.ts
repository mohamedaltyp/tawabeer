import { NextRequest, NextResponse } from "next/server";
import { getAllShops, getShop, createShop, getOwnerShopsByPhone } from "@/lib/db";
import { canCreateShop, getPlanLimits } from "@/lib/plans";

export async function GET() {
  const shops = getAllShops();
  return NextResponse.json({ shops });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner_phone } = body;

    // ── Plan enforcement: check max shops ──
    if (owner_phone) {
      const existingShops = getOwnerShopsByPhone(owner_phone);
      // Assume free plan if no shop yet — will use the actual plan from their first shop
      const plan = existingShops.length > 0 ? existingShops[0].plan : "free";
      if (!canCreateShop(plan, existingShops.length)) {
        const limits = getPlanLimits(plan);
        return NextResponse.json(
          {
            error: `باقتك (${plan === "free" ? "مجاني" : plan}) تسمح فقط بـ ${limits.maxShops} محلات. رقي باقتك لتنشئ المزيد.`,
            code: "plan_limit_reached",
            upgradeUrl: "/dashboard/pricing",
          },
          { status: 403 }
        );
      }
    }

    const shop = createShop(body);
    return NextResponse.json({ shop }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
