     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getAllShops, getShop, createShop, getOwnerShopsByPhone, sanitizeShops, sanitizeShop, sanitizeShopInput } from "@/lib/db";
     3|import { canCreateShop, getPlanLimits } from "@/lib/plans";
     4|
     5|export async function GET() {
     6|  const shops = await sanitizeShops(await getAllShops());
     7|  return NextResponse.json({ shops });
     8|}
     9|
    10|export async function POST(req: NextRequest) {
    11|  try {
    12|    const rawBody = await req.json();
    13|    const body = await sanitizeShopInput(rawBody) as Parameters<typeof createShop>[0];
    14|    const { owner_phone } = body;
    15|
    16|    // ── Plan enforcement: check max shops ──
    17|    if (owner_phone) {
    18|      const existingShops = await getOwnerShopsByPhone(owner_phone);
    19|      // Assume free plan if no shop yet — will use the actual plan from their first shop
    20|      const plan = existingShops.length > 0 ? existingShops[0].plan : "free";
    21|      if (!canCreateShop(plan, existingShops.length)) {
    22|        const limits = getPlanLimits(plan);
    23|        return NextResponse.json(
    24|          {
    25|            error: `باقتك (${plan === "free" ? "مجاني" : plan}) تسمح فقط بـ ${limits.maxShops} محلات. رقي باقتك لتنشئ المزيد.`,
    26|            code: "plan_limit_reached",
    27|            upgradeUrl: "/dashboard/pricing",
    28|          },
    29|          { status: 403 }
    30|        );
    31|      }
    32|    }
    33|
    34|    const shop = await sanitizeShop(await createShop(body));
    35|    return NextResponse.json({ shop }, { status: 201 });
    36|  } catch (e: any) {
    37|    return NextResponse.json({ error: e.message }, { status: 500 });
    38|  }
    39|}
    40|