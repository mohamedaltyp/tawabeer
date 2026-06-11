import { NextRequest, NextResponse } from "next/server";
import { getAllShops, sanitizeShops } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "يرجى إدخال رقم الهاتف وكلمة المرور" }, { status: 400 });
    }

    const allShops = getAllShops();
    const match = allShops.find(
      (s) => s.owner_phone === phone && s.owner_password === password
    );

    if (!match) {
      return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // إرجاع جميع محلات هذا المالك (بدون كلمة المرور)
    const ownerShops = allShops.filter((s) => s.owner_phone === phone);
    const safeShops = sanitizeShops(ownerShops);

    return NextResponse.json({
      success: true,
      owner: { phone: match.owner_phone, name: match.owner_name },
      shops: safeShops,
    });
  } catch {
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
  }
}
