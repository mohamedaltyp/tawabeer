import { NextRequest, NextResponse } from "next/server";
import { getAllShops, sanitizeShops } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { comparePassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

const limiter = createRateLimiter({
  windowMs: 15 * 60_000, // 15 min window
  max: 10, // 10 attempts per 15 min
});

export async function POST(req: NextRequest) {
  try {
    const { allowed, remaining, resetAt } = limiter.check(req);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          },
        },
      );
    }

    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم الهاتف وكلمة المرور" },
        { status: 400 },
      );
    }

    const allShops = await getAllShops();
    
    // Find shops matching the phone number
    const matchingShops = allShops.filter((s) => s.owner_phone === phone);
    
    // Verify password against each matching shop's hash
    let matchedShop = null;
    for (const shop of matchingShops) {
      if (shop.owner_password && await comparePassword(password, shop.owner_password)) {
        matchedShop = shop;
        break;
      }
    }

    if (!matchedShop) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 },
      );
    }

    // إرجاع جميع منشآت هذا المالك (بدون كلمة المرور)
    const safeShops = await sanitizeShops(matchingShops);

    const res = NextResponse.json({
      success: true,
      owner: { phone: matchedShop.owner_phone, name: matchedShop.owner_name },
      shops: safeShops,
    });
    setSessionCookie(res, {
      phone: matchedShop.owner_phone || "",
      name: matchedShop.owner_name || "",
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ في تسجيل الدخول" },
      { status: 500 },
    );
  }
}
