import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

// GET — Set Telegram webhook (call once after deployment)
export async function GET(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "No BOT_TOKEN configured" }, { status: 500 });
  }

  // Get the base URL from the request
  const host = req.headers.get("host") || "tawabeer-mu.vercel.app";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const webhookUrl = `${protocol}://${host}/api/bot/webhook`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      }
    );
    const data = await res.json();
    return NextResponse.json({
      ok: data.ok,
      description: data.description,
      webhook_url: webhookUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
