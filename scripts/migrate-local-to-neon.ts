/**
 * انقل البيانات من SQLite المحلي (data.db) إلى Neon PostgreSQL
 * مع إضافة الأعمدة المفقودة للجداول الموجودة
 */

import { neon, neonConfig } from "@neondatabase/serverless";
import Database from "better-sqlite3";
neonConfig.poolQueryViaFetch = true;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:***@ep-cold-recipe-abnxgw34-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const MISSING_COLUMNS: Record<string, string[]> = {
  shops: [
    "ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS owner_phone TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS owner_password TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'",
    "ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active'",
    "ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
  ],
  queue_entries: [
    "ADD COLUMN IF NOT EXISTS estimated_wait INTEGER DEFAULT 0",
    "ADD COLUMN IF NOT EXISTS recall_count INTEGER DEFAULT 0",
    "ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS counter_id TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ",
  ],
  queue_settings: [
    "ADD COLUMN IF NOT EXISTS avg_service_minutes REAL DEFAULT 10",
    "ADD COLUMN IF NOT EXISTS greeting_message TEXT DEFAULT 'مرحباً بك!'",
    "ADD COLUMN IF NOT EXISTS whatsapp_enabled INTEGER DEFAULT 0",
    "ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS booking_enabled INTEGER DEFAULT 0",
    "ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30",
    "ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 5",
    "ADD COLUMN IF NOT EXISTS booking_advance_days INTEGER DEFAULT 7",
  ],
  notifications: [
    "ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ",
    "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
  ],
};

async function fixSchema(pg: any) {
  console.log("\n🔧 Fixing schema - adding missing columns...");
  for (const [table, cols] of Object.entries(MISSING_COLUMNS)) {
    for (const col of cols) {
      try {
        await pg.unsafe(`ALTER TABLE ${table} ${col}`);
      } catch (e: any) {
        // Column might already exist — ignore
      }
    }
    console.log(`  ✅ ${table} columns checked`);
  }
}

async function main() {
  console.log("🔌 Connecting to Neon...");
  const pg = neon(DATABASE_URL);

  console.log("📁 Reading local SQLite...");
  const local = new Database("data.db", { readonly: true });

  // ─── 1. Fix existing schema ───
  await fixSchema(pg);

  // ─── 2. Create missing tables ───
  console.log("\n📦 Creating missing tables...");
  
  await pg`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other',
      details TEXT NOT NULL DEFAULT '', icon TEXT DEFAULT '💳',
      is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS counters (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT 'شباك 1',
      current_number INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT ''
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, entry_id TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '', customer_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS booking_slots (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL, is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, slot_id TEXT NOT NULL,
      booking_date DATE NOT NULL, customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '', status TEXT DEFAULT 'confirmed',
      notes TEXT DEFAULT '', counter_id TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE CASCADE
    )
  `;

  // ─── 3. Migrate data ───
  console.log("\n🚚 Migrating data...");

  // Shops
  const localShops = local.prepare("SELECT * FROM shops").all() as any[];
  console.log(`  Shops: ${localShops.length} rows`);
  for (const s of localShops) {
    const exists = await pg`SELECT id FROM shops WHERE id = ${s.id}`;
    if (exists.length === 0) {
      await pg`
        INSERT INTO shops (id, name, description, address, phone, category, current_number, is_active, owner_name, owner_phone, owner_password, plan, plan_status, plan_started_at, plan_expires_at, stripe_customer_id, stripe_subscription_id, created_at)
        VALUES (${s.id}, ${s.name||''}, ${s.description||''}, ${s.address||''}, ${s.phone||''}, ${s.category||''}, ${s.current_number||0}, ${s.is_active??1}, ${s.owner_name||''}, ${s.owner_phone||''}, ${s.owner_password||''}, ${s.plan||'free'}, ${s.plan_status||'active'}, ${s.plan_started_at||null}, ${s.plan_expires_at||null}, ${s.stripe_customer_id||''}, ${s.stripe_subscription_id||''}, ${s.created_at||new Date().toISOString()})
      `;
      console.log(`    ✅ "${s.name}" migrated`);
    } else {
      console.log(`    ⏭️ "${s.name}" already exists`);
    }
  }

  // Queue entries
  const localQueue = local.prepare("SELECT * FROM queue_entries").all() as any[];
  console.log(`  Queue entries: ${localQueue.length} rows`);
  for (const q of localQueue) {
    const exists = await pg`SELECT id FROM queue_entries WHERE id = ${q.id}`;
    if (exists.length === 0) {
      await pg`
        INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone, status, estimated_wait, recall_count, created_at, called_at, completed_at)
        VALUES (${q.id}, ${q.shop_id}, ${q.number}, ${q.customer_name||''}, ${q.customer_phone||''}, ${q.status||'waiting'}, ${q.estimated_wait||0}, ${q.recall_count||0}, ${q.created_at||new Date().toISOString()}, ${q.called_at||null}, ${q.completed_at||null})
      `;
    }
  }
  console.log(`    ✅ ${localQueue.length} queue entries done`);

  // Queue settings
  const localSettings = local.prepare("SELECT * FROM queue_settings").all() as any[];
  console.log(`  Queue settings: ${localSettings.length} rows`);
  for (const s of localSettings) {
    const exists = await pg`SELECT shop_id FROM queue_settings WHERE shop_id = ${s.shop_id}`;
    if (exists.length === 0) {
      await pg`
        INSERT INTO queue_settings (shop_id, avg_service_minutes, is_open, greeting_message, whatsapp_enabled, whatsapp_number, whatsapp_business_account_id)
        VALUES (${s.shop_id}, ${s.avg_service_minutes||10}, ${s.is_open??1}, ${s.greeting_message||''}, ${s.whatsapp_enabled||0}, ${s.whatsapp_number||''}, ${s.whatsapp_business_account_id||''})
      `;
    }
  }
  console.log(`    ✅ ${localSettings.length} settings done`);

  // Notifications
  const localNotifs = local.prepare("SELECT * FROM notifications").all() as any[];
  console.log(`  Notifications: ${localNotifs.length} rows`);
  for (const n of localNotifs) {
    const exists = await pg`SELECT id FROM notifications WHERE id = ${n.id}`;
    if (exists.length === 0) {
      await pg`
        INSERT INTO notifications (id, shop_id, entry_id, type, status, recipient, message, sent_at, created_at)
        VALUES (${n.id}, ${n.shop_id}, ${n.entry_id}, ${n.type||'whatsapp'}, ${n.status||'pending'}, ${n.recipient||''}, ${n.message||''}, ${n.sent_at||null}, ${n.created_at||new Date().toISOString()})
      `;
    }
  }
  console.log(`    ✅ ${localNotifs.length} notifications done`);

  console.log("\n🎉 Migration complete!");
  local.close();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
