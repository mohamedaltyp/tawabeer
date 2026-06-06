import { NextResponse } from "next/server";
import { ensureMigrated } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let allOk = true;

  // 1. Server up check
  checks.server = "✅";
  const started = new Date().toISOString();

  // 2. Database check
  try {
    await ensureMigrated();
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    await sql`SELECT 1 as ping`;
    checks.database = "✅ (connected)";
  } catch (e: any) {
    checks.database = `❌ ${e.message}`;
    allOk = false;
  }

  // 3. Memory usage
  const mem = process.memoryUsage();
  checks.memory = `✅ ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`;

  // 4. Uptime
  checks.uptime = `✅ ${Math.floor(process.uptime() / 60)} min`;

  // 5. Telegram Bot check
  const botToken = process.env.BOT_TOKEN || "";
  if (botToken) {
    try {
      const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { signal: AbortSignal.timeout(5000) });
      const botData = await botRes.json();
      if (botData.ok) {
        checks.telegram_bot = `✅ @${botData.result.username}`;
      } else {
        checks.telegram_bot = "❌ bot error";
        allOk = false;
      }
    } catch (e: any) {
      checks.telegram_bot = `❌ ${e.message}`;
      allOk = false;
    }
  } else {
    checks.telegram_bot = "⚠️ no token";
  }

  // 6. Telegram Webhook check
  if (botToken) {
    try {
      const whRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`, { signal: AbortSignal.timeout(5000) });
      const whData = await whRes.json();
      if (whData.ok && whData.result.url) {
        checks.telegram_webhook = `✅ ${whData.result.url.substring(0, 50)}...`;
        if (whData.result.pending_update_count > 10) {
          checks.telegram_webhook += ` (${whData.result.pending_update_count} pending)`;
        }
      } else {
        checks.telegram_webhook = "❌ no webhook";
        allOk = false;
      }
    } catch (e: any) {
      checks.telegram_webhook = `❌ ${e.message}`;
    }
  } else {
    checks.telegram_webhook = "⚠️ no token";
  }

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    timestamp: started,
    checks,
  });
}
