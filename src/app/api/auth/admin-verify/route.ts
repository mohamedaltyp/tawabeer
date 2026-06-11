import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";

    if (token === adminPassword) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
