import { NextRequest, NextResponse } from "next/server";
import { sendTelegramNotification, notifyCustomerCalled } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chat_id, message, test_call } = body;

    if (test_call) {
      // Simulate a call notification
      const result = await notifyCustomerCalled(
        chat_id || 1027781923,
        "مختبر الأمل الطبي",
        43,
        0
      );
      return NextResponse.json({
        success: result.sent,
        error: result.error,
        message: "تم إرسال إشعار المناداة",
      });
    }

    // Simple test message
    const result = await sendTelegramNotification(
      chat_id || 1027781923,
      message || "🔔 رسالة اختبار من توابير!"
    );

    return NextResponse.json({
      success: result.sent,
      error: result.error,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "استخدم POST مع chat_id و message",
  });
}
