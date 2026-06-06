     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getAllShops, sanitizeShops } from "@/lib/db";
     3|
     4|export async function POST(req: NextRequest) {
     5|  try {
     6|    const { phone, password } = await req.json();
     7|
     8|    if (!phone || !password) {
     9|      return NextResponse.json({ error: "يرجى إدخال رقم الهاتف وكلمة المرور" }, { status: 400 });
    10|    }
    11|
    12|    const allShops = await getAllShops();
    13|    const match = allShops.find(
    14|      (s) => s.owner_phone === phone && s.owner_password === password
    15|    );
    16|
    17|    if (!match) {
    18|      return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
    19|    }
    20|
    21|    // إرجاع جميع محلات هذا المالك (بدون كلمة المرور)
    22|    const ownerShops = allShops.filter((s) => s.owner_phone === phone);
    23|    const safeShops = await sanitizeShops(ownerShops);
    24|
    25|    return NextResponse.json({
    26|      success: true,
    27|      owner: { phone: match.owner_phone, name: match.owner_name },
    28|      shops: safeShops,
    29|    });
    30|  } catch {
    31|    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
    32|  }
    33|}
    34|