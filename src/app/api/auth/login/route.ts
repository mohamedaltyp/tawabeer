import { NextRequest, NextResponse } from "next/server";
import { getAllShops, sanitizeShops } from "@/lib/db";

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }
  if (record.count >= 10) return false; // 10 attempts per 15 min
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "يرجى إدخال رقم الهاتف وكلمة المرور" }, { status: 400 });
    }

    const allShops = await getAllShops();
    const match = allShops.find(
      (s) => s.owner_phone === phone && s.owner_password === password
    );

    if (!match) {
      return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // إرجاع جميع محلات هذا المالك (بدون كلمة المرور)
    const ownerShops = allShops.filter((s) => s.owner_phone === phone);
    const safeShops = await sanitizeShops(ownerShops);

    return NextResponse.json({
      success: true,
      owner: { phone: match.owner_phone, name: match.owner_name },
      shops: safeShops,
    });
  } catch {
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
  }
}
