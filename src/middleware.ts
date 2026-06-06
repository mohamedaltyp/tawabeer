import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Migration: تتم مرة واحدة عند أول استدعاء لوحدة التحكم
let migrated = false;

export async function middleware(request: NextRequest) {
  // Only apply to /api/* routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Run migration on first API call (cold start)
  if (!migrated) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

      // Create tables
      await sql`CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', address TEXT DEFAULT '', phone TEXT DEFAULT '', category TEXT DEFAULT '', current_number INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, owner_name TEXT DEFAULT '', owner_phone TEXT DEFAULT '', owner_password TEXT DEFAULT '', plan TEXT DEFAULT 'free', plan_status TEXT DEFAULT 'active', plan_started_at TIMESTAMPTZ, plan_expires_at TIMESTAMPTZ, stripe_customer_id TEXT DEFAULT '', stripe_subscription_id TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS queue_entries (id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, number INTEGER NOT NULL, customer_name TEXT DEFAULT '', customer_phone TEXT DEFAULT '', status TEXT DEFAULT 'waiting', estimated_wait INTEGER DEFAULT 0, recall_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE)`;
      await sql`CREATE TABLE IF NOT EXISTS queue_settings (shop_id TEXT PRIMARY KEY, avg_service_minutes REAL DEFAULT 10, is_open INTEGER DEFAULT 1, greeting_message TEXT DEFAULT 'مرحباً بك!', whatsapp_enabled INTEGER DEFAULT 0, whatsapp_number TEXT DEFAULT '', whatsapp_business_account_id TEXT DEFAULT '', FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE)`;
      await sql`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, entry_id TEXT NOT NULL, type TEXT DEFAULT 'whatsapp', status TEXT DEFAULT 'pending', recipient TEXT DEFAULT '', message TEXT DEFAULT '', sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE, FOREIGN KEY (entry_id) REFERENCES queue_entries(id) ON DELETE CASCADE)`;
      await sql`CREATE TABLE IF NOT EXISTS payment_methods (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other', details TEXT NOT NULL DEFAULT '', icon TEXT DEFAULT '💳', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`;
      // Add telegram_chat_id to queue_entries if not exists
      await sql`ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT ''`;

      // Create telegram_links table for phone↔chat_id mapping
      await sql`CREATE TABLE IF NOT EXISTS telegram_links (
        phone TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      migrated = true;
      console.log("✅ Database migration complete");
    } catch (e: any) {
      console.error("❌ Migration failed:", e.message);
    }
  }

  return NextResponse.next();
}

// Match all API routes
export const config = {
  matcher: "/api/:path*",
};
