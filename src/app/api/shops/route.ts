import { NextRequest, NextResponse } from "next/server";
import { getAllShops, getShop, createShop, getOwnerShopsByPhone, sanitizeShops, sanitizeShop, sanitizeShopInput } from "@/lib/db";
import { canCreateShop, getPlanLimits } from "@/lib/plans";

export async function GET() {
  try {
    const shops = await sanitizeShops(await getAllShops());
    return NextResponse.json({ shops });
  } catch (e: any) {
    console.error("GET /api/shops error:", e);
    return NextResponse.json({ error: e.message, stack: e.stack?.split("\n").slice(0, 5).join("\n") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body = await sanitizeShopInput(rawBody) as Parameters<typeof createShop>[0];
    const { owner_phone } = body;

    // ── Plan enforcement: check max shops ──
    if (owner_phone) {
      const existingShops = await getOwnerShopsByPhone(owner_phone);
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

    const shop = await sanitizeShop(await createShop(body));
    return NextResponse.json({ shop }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
