/**
 * Data migration script: SQLite → PostgreSQL (Neon/Vercel)
 * 
 * Usage:
 *   1. Set DATABASE_URL in .env.local to your Neon connection string
 *   2. Run: npx tsx scripts/migrate-to-pg.ts
 * 
 * This exports SQLite data and imports it to PostgreSQL.
 */

import Database from "better-sqlite3";
import path from "path";
import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

neonConfig.poolQueryViaFetch = true;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env.local or environment");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("🔌 Connecting to PostgreSQL...");
  
  // Read SQLite data
  const dbPath = path.join(process.cwd(), "data.db");
  if (require("fs").existsSync(dbPath)) {
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");

    // 1. Migrate shops
    console.log("📦 Migrating shops...");
    const shops = sqlite.prepare("SELECT * FROM shops").all() as any[];
    for (const shop of shops) {
      try {
        await sql`
          INSERT INTO shops (id, name, description, address, phone, category, current_number, is_active, owner_name, owner_phone, owner_password, plan, plan_status, plan_started_at, plan_expires_at, stripe_customer_id, stripe_subscription_id, created_at)
          VALUES (${shop.id}, ${shop.name}, ${shop.description || ""}, ${shop.address || ""}, ${shop.phone || ""}, ${shop.category || ""}, ${shop.current_number || 0}, ${shop.is_active ?? 1}, ${shop.owner_name || ""}, ${shop.owner_phone || ""}, ${shop.owner_password || ""}, ${shop.plan || "free"}, ${shop.plan_status || "active"}, ${shop.plan_started_at || null}, ${shop.plan_expires_at || null}, ${shop.stripe_customer_id || ""}, ${shop.stripe_subscription_id || ""}, ${shop.created_at || new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ Shop ${shop.id}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${shops.length} shops migrated`);

    // 2. Migrate queue entries
    console.log("📦 Migrating queue entries...");
    const entries = sqlite.prepare("SELECT * FROM queue_entries").all() as any[];
    for (const entry of entries) {
      try {
        await sql`
          INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone, status, estimated_wait, recall_count, created_at, called_at, completed_at)
          VALUES (${entry.id}, ${entry.shop_id}, ${entry.number}, ${entry.customer_name || ""}, ${entry.customer_phone || ""}, ${entry.status || "waiting"}, ${entry.estimated_wait || 0}, ${entry.recall_count || 0}, ${entry.created_at || new Date().toISOString()}, ${entry.called_at || null}, ${entry.completed_at || null})
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ Entry ${entry.id}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${entries.length} queue entries migrated`);

    // 3. Migrate queue settings
    console.log("📦 Migrating queue settings...");
    const settings = sqlite.prepare("SELECT * FROM queue_settings").all() as any[];
    for (const s of settings) {
      try {
        await sql`
          INSERT INTO queue_settings (shop_id, avg_service_minutes, is_open, greeting_message, whatsapp_enabled, whatsapp_number, whatsapp_business_account_id)
          VALUES (${s.shop_id}, ${s.avg_service_minutes || 10}, ${s.is_open ?? 1}, ${s.greeting_message || "مرحباً بك!"}, ${s.whatsapp_enabled || 0}, ${s.whatsapp_number || ""}, ${s.whatsapp_business_account_id || ""})
          ON CONFLICT (shop_id) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ Settings ${s.shop_id}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${settings.length} settings migrated`);

    // 4. Migrate notifications
    console.log("📦 Migrating notifications...");
    const notifications = sqlite.prepare("SELECT * FROM notifications").all() as any[];
    for (const n of notifications) {
      try {
        await sql`
          INSERT INTO notifications (id, shop_id, entry_id, type, status, recipient, message, sent_at, created_at)
          VALUES (${n.id}, ${n.shop_id}, ${n.entry_id}, ${n.type || "whatsapp"}, ${n.status || "pending"}, ${n.recipient || ""}, ${n.message || ""}, ${n.sent_at || null}, ${n.created_at || new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ Notification ${n.id}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${notifications.length} notifications migrated`);

    // 5. Migrate payment methods
    console.log("📦 Migrating payment methods...");
    const paymentMethods = sqlite.prepare("SELECT * FROM payment_methods").all() as any[];
    for (const pm of paymentMethods) {
      try {
        await sql`
          INSERT INTO payment_methods (id, name, type, details, icon, is_active, sort_order, created_at)
          VALUES (${pm.id}, ${pm.name}, ${pm.type || "other"}, ${pm.details || ""}, ${pm.icon || "💳"}, ${pm.is_active ?? 1}, ${pm.sort_order || 0}, ${pm.created_at || new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ PaymentMethod ${pm.id}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${paymentMethods.length} payment methods migrated`);

    // 6. Migrate app settings
    console.log("📦 Migrating app settings...");
    const appSettings = sqlite.prepare("SELECT * FROM app_settings").all() as any[];
    for (const s of appSettings) {
      try {
        await sql`
          INSERT INTO app_settings (key, value)
          VALUES (${s.key}, ${s.value})
          ON CONFLICT (key) DO NOTHING
        `;
      } catch (e: any) {
        console.error(`  ❌ AppSetting ${s.key}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${appSettings.length} app settings migrated`);

    sqlite.close();
    console.log("\n🎉 Migration complete!");
  } else {
    console.log("⚠️ No SQLite data.db found. Starting fresh.");
  }

  // Verify
  const counts = await sql`
    SELECT 'shops' as tbl, COUNT(*)::int as c FROM shops
    UNION ALL SELECT 'queue_entries', COUNT(*)::int FROM queue_entries
    UNION ALL SELECT 'queue_settings', COUNT(*)::int FROM queue_settings
    UNION ALL SELECT 'payment_methods', COUNT(*)::int FROM payment_methods
    UNION ALL SELECT 'app_settings', COUNT(*)::int FROM app_settings
  `;
  console.log("\n📊 Verification:");
  for (const row of counts as any[]) {
    console.log(`  ${row.tbl}: ${row.c} rows`);
  }
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
