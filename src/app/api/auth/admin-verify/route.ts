import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminPassword } from "@/lib/auth";
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

    const { token } = await req.json();
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: "خدمة الإدارة غير مهيأة (ADMIN_PASSWORD غير مضبوط)" },
        { status: 503 },
      );
    }

    if (token === adminPassword) {
      const res = NextResponse.json({ success: true });
      setSessionCookie(res, { phone: "admin", name: "Admin", isAdmin: true });
      return res;
    }
    return NextResponse.json(
      { success: false, error: "كلمة المرور غير صحيحة" },
      { status: 401 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ" },
      { status: 500 },
    );
  }
}
