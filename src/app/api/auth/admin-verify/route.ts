import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

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
    const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";

    if (token === adminPassword) {
      return NextResponse.json({ success: true });
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
