import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

neonConfig.poolQueryViaFetch = true;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setup() {
  console.log("🔧 Creating tables...");
  
  await sql`CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
    address TEXT DEFAULT '', phone TEXT DEFAULT '', category TEXT DEFAULT '',
    current_number INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
    owner_name TEXT DEFAULT '', owner_phone TEXT DEFAULT '', owner_password TEXT DEFAULT '',
    plan TEXT DEFAULT 'free', plan_status TEXT DEFAULT 'active',
    plan_started_at TIMESTAMPTZ, plan_expires_at TIMESTAMPTZ,
    stripe_customer_id TEXT DEFAULT '', stripe_subscription_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  
  await sql`CREATE TABLE IF NOT EXISTS queue_entries (
    id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, number INTEGER NOT NULL,
    customer_name TEXT DEFAULT '', customer_phone TEXT DEFAULT '',
    status TEXT DEFAULT 'waiting', estimated_wait INTEGER DEFAULT 0,
    recall_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  )`;
  
  await sql`CREATE TABLE IF NOT EXISTS queue_settings (
    shop_id TEXT PRIMARY KEY, avg_service_minutes REAL DEFAULT 10,
    is_open INTEGER DEFAULT 1, greeting_message TEXT DEFAULT 'مرحباً بك!',
    whatsapp_enabled INTEGER DEFAULT 0, whatsapp_number TEXT DEFAULT '',
    whatsapp_business_account_id TEXT DEFAULT '',
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  )`;
  
  await sql`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, entry_id TEXT NOT NULL,
    type TEXT DEFAULT 'whatsapp', status TEXT DEFAULT 'pending',
    recipient TEXT DEFAULT '', message TEXT DEFAULT '',
    sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  
  await sql`CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other',
    details TEXT NOT NULL DEFAULT '', icon TEXT DEFAULT '💳',
    is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  
  await sql`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT ''
  )`;
  
  console.log("✅ Tables created");
  console.log("\n📊 Empty DB ready at:");
  console.log((DATABASE_URL || "").replace(/:[^:@]+@/, ':****@'));
}

setup().catch(e => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
