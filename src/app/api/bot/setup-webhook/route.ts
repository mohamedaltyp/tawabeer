import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

export async function GET(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "No BOT_TOKEN configured" }, { status: 500 });
  }

  const host = req.headers.get("host") || "tawabeer-mu.vercel.app";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const bypass = req.nextUrl.searchParams.get("bypass") || "";
  
  // Use the bypass token to make the webhook reachable
  const webhookUrl = `${protocol}://${host}/api/bot/webhook`;
  const bypassUrl = bypass ? `${webhookUrl}?x-vercel-protection-bypass=${bypass}` : webhookUrl;

  const results: Record<string, any> = {};
  
  // First, check current webhook
  const currentRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const currentData = await currentRes.json();
  results.old_webhook = currentData.ok ? currentData.result : currentData;

  // Remove old webhook
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);

  // Set new webhook
  const setRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: bypassUrl,
        allowed_updates: ["message"],
        drop_pending_updates: true,
        max_connections: 40,
      }),
    }
  );
  const setData = await setRes.json();
  results.set_webhook = setData;
  results.new_webhook_url = bypassUrl;

  // Verify
  const verifyRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const verifyData = await verifyRes.json();
  results.verify = verifyData.ok ? verifyData.result : verifyData;

  return NextResponse.json(results);
}
