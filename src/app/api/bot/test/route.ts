import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

export async function GET(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "No BOT_TOKEN" });
  }

  const action = req.nextUrl.searchParams.get("action") || "test";
  const chatId = req.nextUrl.searchParams.get("chat_id") || "1027781923";
  const results: Record<string, any> = { action };

  try {
    // Send a test message to the specified chat_id
    if (action === "send-test") {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parseInt(chatId),
          text: "🔔 <b>اختبار البوت</b>\n\nإذا شفت هذه الرسالة، فالبوت شغال 100%! 🎉\n\nارسلي /start عشان تشوف القائمة الكاملة.",
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      results.send_result = data;
      results.send_ok = data.ok;
    }

    // Check chat member status
    if (action === "check-chat") {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${chatId}`);
      const data = await res.json();
      results.chat = data;
    }

    // Log all recent bot errors  
    if (action === "recent-errors") {
      const whRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const whData = await whRes.json();
      results.webhook_info = whData.ok ? whData.result : whData;
    }

    results.bot_token_prefix = BOT_TOKEN.substring(0, 12) + "...";
  } catch (e: any) {
    results.error = e.message;
  }

  return NextResponse.json(results);
}
