import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/auth";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = req.headers.get("x-admin-password") || searchParams.get("token");
  const adminPassword = getAdminPassword();
  if (!adminPassword || token !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const checks: Record<string, any> = {};
  checks.bot_token_set = !!BOT_TOKEN;
  checks.bot_token_prefix = BOT_TOKEN ? BOT_TOKEN.substring(0, 10) + "..." : "NOT SET";

  // Check webhook with Telegram API
  if (BOT_TOKEN) {
    try {
      const whRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const whData = await whRes.json();
      checks.telegram_api = "✅ reachable";
      checks.webhook = whData.ok ? whData.result : whData;
      
      // Also test sending a message to a known chat (the admin)
      checks.me = await (await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)).json();
      
      // Check if webhook URL matches
      checks.expected_url = "https://tawabeer-mu.vercel.app/api/bot/webhook";
      if (whData.ok && whData.result?.url) {
        checks.webhook_match = whData.result.url === checks.expected_url;
      } else {
        checks.webhook_match = false;
      }
    } catch (e: any) {
      checks.telegram_api = `❌ ${e.message}`;
    }
  }
  
  // Check if DB has telegram_links table
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('telegram_links', 'queue_entries')
    ` as any[];
    checks.db_tables = tables.map((t: any) => t.table_name);
    
    if (checks.db_tables.includes('telegram_links')) {
      const count = await sql`SELECT COUNT(*)::int as count FROM telegram_links` as any[];
      checks.telegram_links_count = count[0]?.count || 0;
    }
  } catch (e: any) {
    checks.db_check = `❌ ${e.message}`;
  }

  return NextResponse.json(checks);
}
