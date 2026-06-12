import { neon, neonConfig } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { notifyCustomerCalled } from "./telegram";
import { generateWaMeLink, generateMyTurnMessage } from "./whatsapp";
import { hashPassword } from "./auth";
import { getOrSet, invalidate, invalidatePrefix } from "./cache";

// Allow HTTP mode (no WebSocket needed) — works on Vercel Edge + Serverless
neonConfig.poolQueryViaFetch = true;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = neon(DATABASE_URL);

// ─── Schema Setup ────────────────────────────

async function runMigrations() {
  // Enable UUID extension
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      category TEXT DEFAULT '',
      current_number INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      owner_name TEXT DEFAULT '',
      owner_phone TEXT DEFAULT '',
      owner_password TEXT DEFAULT '',
      plan TEXT DEFAULT 'free',
      plan_status TEXT DEFAULT 'active',
      plan_started_at TIMESTAMPTZ,
      plan_expires_at TIMESTAMPTZ,
      stripe_customer_id TEXT DEFAULT '',
      stripe_subscription_id TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS queue_entries (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      status TEXT DEFAULT 'waiting',
      estimated_wait INTEGER DEFAULT 0,
      recall_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      called_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS queue_settings (
      shop_id TEXT PRIMARY KEY,
      avg_service_minutes REAL DEFAULT 10,
      is_open INTEGER DEFAULT 1,
      greeting_message TEXT DEFAULT 'مرحباً بك!',
      whatsapp_enabled INTEGER DEFAULT 0,
      whatsapp_number TEXT DEFAULT '',
      whatsapp_business_account_id TEXT DEFAULT '',
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      type TEXT DEFAULT 'whatsapp',
      status TEXT DEFAULT 'pending',
      recipient TEXT DEFAULT '',
      message TEXT DEFAULT '',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (entry_id) REFERENCES queue_entries(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      details TEXT NOT NULL DEFAULT '',
      icon TEXT DEFAULT '💳',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS counters (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'شباك 1',
      current_number INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      entry_id TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS booking_slots (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      booking_date DATE NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      status TEXT DEFAULT 'confirmed',
      notes TEXT DEFAULT '',
      counter_id TEXT DEFAULT '',
      queue_number INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE CASCADE
    )
  `;

  // Migration: Add plan columns if they don't exist (safe to run multiple times)
  const migrations = [
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active'`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT ''`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT ''`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT ''`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT DEFAULT ''`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT DEFAULT ''`,
    `ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS recall_count INTEGER DEFAULT 0`,
    `ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT ''`,
    `ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS counter_id TEXT DEFAULT ''`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS booking_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 5`,
    `ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS booking_advance_days INTEGER DEFAULT 7`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_password TEXT DEFAULT ''`,
    `ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS push_subscription TEXT DEFAULT ''`,
  ];
  for (const m of migrations) {
    try { await sql.unsafe(m); } catch { /* column already exists */ }
  }

  // Migration: Hash any existing plain-text owner passwords
  const shops = await sql`SELECT id, owner_password FROM shops WHERE owner_password IS NOT NULL AND owner_password != ''` as unknown as { id: string; owner_password: string }[];
  for (const shop of shops) {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ — if it doesn't, it's plain text
    if (!shop.owner_password.startsWith('$2a$') && !shop.owner_password.startsWith('$2b$') && !shop.owner_password.startsWith('$2y$')) {
      const hashed = await hashPassword(shop.owner_password);
      await sql`UPDATE shops SET owner_password = ${hashed} WHERE id = ${shop.id}`;
    }
  }

  // Default payment methods if empty
  const { count: pmCount } = await sql`SELECT COUNT(*)::int as count FROM payment_methods` as unknown as { count: number };
  if (pmCount === 0) {
    await sql`
      INSERT INTO payment_methods (id, name, type, details, icon, sort_order) VALUES
      (${uuidv4()}, 'فودافون كاش', 'vodafone_cash', '٠١٠٠٠٠٠٠٠٠ (محمد)', '📱', 1),
      (${uuidv4()}, 'بنك مصر', 'bank_transfer', '١٠٠٠-٢٠٠٠٠٠-٣٠٠ (دورك لتقنية المعلومات)', '🏦', 2),
      (${uuidv4()}, 'إنستا باي', 'instapay', 'instapay@example.com', '💳', 3)
    `;
  }

  // Default app settings
  const { count: stCount } = await sql`SELECT COUNT(*)::int as count FROM app_settings` as unknown as { count: number };
  if (stCount === 0) {
    await sql`INSERT INTO app_settings (key, value) VALUES ('admin_whatsapp', '01000000000')`;
  }
}

// ─── Types ────────────────────────────────────

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  category: string;
  current_number: number;
  is_active: number;
  owner_name: string;
  owner_phone: string;
  owner_password: string;
  plan: string;
  plan_status: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  shop_id: string;
  number: number;
  customer_name: string;
  customer_phone: string;
  status: "waiting" | "called" | "completed" | "cancelled";
  estimated_wait: number;
  recall_count: number;
  telegram_chat_id: string;
  counter_id: string;
  push_subscription: string;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface QueueSettings {
  shop_id: string;
  avg_service_minutes: number;
  is_open: number;
  greeting_message: string;
  whatsapp_enabled: number;
  whatsapp_number: string;
  whatsapp_business_account_id: string;
  whatsapp_access_token: string;
  booking_enabled: number;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  booking_advance_days: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  details: string;
  icon: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export interface Counter {
  id: string;
  shop_id: string;
  name: string;
  current_number: number;
  is_active: number;
  created_at: string;
}

export interface BookingSlot {
  id: string;
  shop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: number;
  created_at: string;
}

export interface Rating {
  id: string;
  shop_id: string;
  entry_id: string | null;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
}

export interface Booking {
  id: string;
  shop_id: string;
  slot_id: string;
  booking_date: string;
  customer_name: string;
  customer_phone: string;
  status: "confirmed" | "cancelled" | "completed";
  notes: string;
  counter_id: string;
  created_at: string;
}

// ─── Shops ────────────────────────────────────────

export async function createShop(data: {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_password?: string;
}): Promise<Shop> {
  const id = uuidv4();
  const slug = data.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "") || `shop-${id.slice(0, 8)}`;
  const hashedPassword = data.owner_password ? await hashPassword(data.owner_password) : "";
  await sql`
    INSERT INTO shops (id, name, slug, description, address, phone, category, owner_name, owner_phone, owner_password)
    VALUES (${id}, ${data.name}, ${slug}, ${data.description || ""}, ${data.address || ""}, ${data.phone || ""}, ${data.category || ""}, ${data.owner_name || ""}, ${data.owner_phone || ""}, ${hashedPassword})
  `;
  await sql`INSERT INTO queue_settings (shop_id) VALUES (${id})`;
  invalidate("shops:all");
  return getShop(id) as Promise<Shop>;
}

export async function getAllShops(): Promise<Shop[]> {
  return getOrSet("shops:all", 10_000, () =>
    sql`SELECT * FROM shops WHERE is_active = true ORDER BY name` as unknown as Promise<Shop[]>,
  );
}

export async function getShop(id: string): Promise<Shop | undefined> {
  return getOrSet(`shop:${id}`, 10_000, async () => {
    const rows = await sql`SELECT * FROM shops WHERE id = ${id}` as unknown as Shop[];
    return rows[0];
  });
}

export async function updateShop(id: string, data: Partial<Shop>): Promise<Shop | undefined> {
  const keys = Object.keys(data).filter(k => k !== "id");
  if (keys.length === 0) return getShop(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => (data as any)[k]);
  const query = `UPDATE shops SET ${setClauses.join(", ")} WHERE id = $${keys.length + 1}`;
  const result = await sql.query(query, [...values, id]);
  invalidate(`shop:${id}`);
  invalidate("shops:all");
  return getShop(id);
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>&\"']/g, (char) => {
      switch (char) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case '"': return "&quot;";
        case "'": return "&#x27;";
        default: return char;
      }
    })
    .trim();
}

export function sanitizeShopInput(body: Record<string, any>): Record<string, any> {
  const textFields = ["name", "description", "address", "category", "owner_name", "owner_phone", "phone"];
  const sanitized = { ...body };
  for (const key of textFields) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeText(sanitized[key]);
    }
  }
  return sanitized;
}

export function sanitizeShop(shop: Shop): Omit<Shop, 'owner_password'> {
  const { owner_password, ...safe } = shop;
  return safe;
}

export function sanitizeShops(shops: Shop[]): Omit<Shop, 'owner_password'>[] {
  return shops.map(sanitizeShop);
}

export async function getOwnerShopsByPhone(ownerPhone: string): Promise<Shop[]> {
  return await sql`SELECT * FROM shops WHERE owner_phone = ${ownerPhone} ORDER BY created_at DESC` as unknown as Shop[];
}

export async function getShopPlan(shopId: string): Promise<string> {
  const shop = await getShop(shopId);
  return shop?.plan || "free";
}

export async function updateShopPlan(
  shopId: string,
  plan: string,
  expiresAt?: string
): Promise<Shop | undefined> {
  const updates: Record<string, any> = { plan };
  if (expiresAt) {
    updates.plan_expires_at = expiresAt;
    updates.plan_status = "active";
    updates.plan_started_at = new Date().toISOString();
  }
  return updateShop(shopId, updates);
}

export async function isPlanActive(shopId: string): Promise<boolean> {
  const shop = await getShop(shopId);
  if (!shop) return false;
  if (shop.plan === "free") return true;
  if (shop.plan_status !== "active") return false;
  if (shop.plan_expires_at && new Date(shop.plan_expires_at) < new Date()) {
    return false;
  }
  return true;
}

// ─── Queue ────────────────────────────────────────

export async function getNextNumber(shopId: string): Promise<number> {
  const rows = await sql`SELECT COALESCE(MAX(number), 0) + 1 as next_num FROM queue_entries WHERE shop_id = ${shopId}` as unknown as { next_num: number }[];
  return rows[0]?.next_num || 1;
}

export async function joinQueue(data: {
  shopId: string;
  customerName?: string;
  customerPhone?: string;
  counterId?: string;
}): Promise<{ entry: QueueEntry; position: number; estimatedWait: number; telegram_link_url: string }> {
  // Ensure counter_id column exists (safe, runs once per connection)
  try { await sql`ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS counter_id TEXT DEFAULT ''`; } catch {}
  
  const number = await getNextNumber(data.shopId);
  const id = uuidv4();

  // Check if phone is linked to Telegram
  let telegramChatId = "";
  if (data.customerPhone) {
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, "");
    const links = await sql`SELECT chat_id FROM telegram_links WHERE phone = ${cleanPhone}` as unknown as { chat_id: string }[];
    if (links.length > 0) {
      telegramChatId = links[0].chat_id;
    }
  }

  // Get active queue count for position
  const countRows = await sql`SELECT COUNT(*)::int as count FROM queue_entries WHERE shop_id = ${data.shopId} AND status = 'waiting'` as unknown as { count: number }[];
  const position = countRows[0]?.count || 0;

  // Get average service time
  const settingsRows = await sql`SELECT * FROM queue_settings WHERE shop_id = ${data.shopId}` as unknown as QueueSettings[];
  const avgMinutes = settingsRows[0]?.avg_service_minutes || 10;
  const estimatedWait = (position + 1) * avgMinutes;

  await sql`
    INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone, estimated_wait, telegram_chat_id, counter_id)
    VALUES (${id}, ${data.shopId}, ${number}, ${data.customerName || ""}, ${data.customerPhone || ""}, ${estimatedWait}, ${telegramChatId}, ${data.counterId || ""})
  `;

  // Update shop current number if this is the first entry
  const shop = await getShop(data.shopId);
  if (shop && shop.current_number === 0) {
    await sql`UPDATE shops SET current_number = ${number} WHERE id = ${data.shopId}`;
  }

  const entry = await getQueueEntry(id);

  // Invalidate caches after queue mutation
  invalidate(`active_queue:${data.shopId}`);

  // Generate Telegram deep link URL
  const telegram_link_url = `https://t.me/tawabeer_bot?start=link_${id}`;

  return {
    entry: entry!,
    position: position + 1,
    estimatedWait,
    telegram_link_url,
  };
}

export async function getQueueEntries(shopId: string): Promise<QueueEntry[]> {
  return await sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} ORDER BY number ASC` as unknown as QueueEntry[];
}

export async function getActiveQueue(shopId: string): Promise<QueueEntry[]> {
  return getOrSet(`active_queue:${shopId}`, 5_000, () =>
    sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} AND status = 'waiting' ORDER BY number ASC` as unknown as Promise<QueueEntry[]>,
  );
}

export async function getQueueEntry(id: string): Promise<QueueEntry | undefined> {
  const rows = await sql`SELECT * FROM queue_entries WHERE id = ${id}` as unknown as QueueEntry[];
  return rows[0];
}

export async function callNext(shopId: string, counterId?: string): Promise<QueueEntry | null> {
  const rows = await sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} AND status = 'waiting' ORDER BY number ASC LIMIT 1` as unknown as QueueEntry[];
  const next = rows[0];
  if (!next) return null;

  await sql`UPDATE queue_entries SET status = 'called', called_at = NOW(), counter_id = ${counterId || ''} WHERE id = ${next.id}`;
  await sql`UPDATE shops SET current_number = ${next.number} WHERE id = ${shopId}`;
  // Update counter current number
  if (counterId) {
    await sql`UPDATE counters SET current_number = ${next.number} WHERE id = ${counterId}`;
  }

  const updated = await getQueueEntry(next.id) || null;

  // Send notifications: Browser Push → Telegram → WhatsApp (fallback chain)
  if (updated) {
    const shop = await getShop(shopId);
    const shopName = shop?.name || "المحل";
    const settings = await getQueueSettings(shopId);

    // 1️⃣ Browser Push Notification (PRIMARY)
    if (updated.push_subscription) {
      try {
        const { notifyCustomerPush } = await import("./push");
        const sub = JSON.parse(updated.push_subscription);
        const result = await notifyCustomerPush(sub, shopName, updated.number, 0);
        if (result.sent) return updated; // ✅ Push succeeded — no need for fallbacks
      } catch {}
    }

    // 2️⃣ Telegram (FALLBACK)
    if (updated.telegram_chat_id) {
      try {
        const waLink = settings?.whatsapp_number ? generateWaMeLink(settings.whatsapp_number, generateMyTurnMessage(shopName, updated.number)) : undefined;
        await notifyCustomerCalled(updated.telegram_chat_id, shopName, updated.number, 0, updated.customer_phone || undefined, waLink);
      } catch {}
    }

    // 3️⃣ WhatsApp API (FALLBACK)
    if (settings?.whatsapp_enabled && settings?.whatsapp_access_token && settings?.whatsapp_business_account_id && updated.customer_phone) {
      try {
        const { sendWhatsAppMessage } = await import("./whatsapp");
        const msg = `🔔 حان دورك!\n\nرقم ${updated.number} — تفضل إلى ${shopName} 🏪\n\n🎉 دورك جه! يرجى التوجه الآن`;
        await sendWhatsAppMessage(updated.customer_phone, msg, settings.whatsapp_access_token, settings.whatsapp_business_account_id);
      } catch {}
    }
  }

  return updated;
}

export async function completeEntry(id: string): Promise<QueueEntry | undefined> {
  await sql`UPDATE queue_entries SET status = 'completed', completed_at = NOW() WHERE id = ${id}`;
  return getQueueEntry(id);
}

export async function cancelEntry(id: string): Promise<QueueEntry | undefined> {
  await sql`UPDATE queue_entries SET status = 'cancelled' WHERE id = ${id}`;
  return getQueueEntry(id);
}

export async function callAgain(id: string): Promise<QueueEntry | undefined> {
  const entry = await getQueueEntry(id);
  if (!entry) return undefined;
  await sql`UPDATE queue_entries SET status = 'called', called_at = NOW(), recall_count = recall_count + 1 WHERE id = ${id}`;
  await sql`UPDATE shops SET current_number = ${entry.number} WHERE id = ${entry.shop_id}`;

  const updated = await getQueueEntry(id);

  // Send notifications (Telegram + WhatsApp)
  if (updated) {
    const shop = await getShop(entry.shop_id);
    const shopName = shop?.name || "المحل";
    const settings = await getQueueSettings(entry.shop_id);

    // Telegram notification (includes WhatsApp link if available)
    if (updated.telegram_chat_id) {
      try {
        const waLink = settings?.whatsapp_number ? generateWaMeLink(settings.whatsapp_number, generateMyTurnMessage(shopName, updated.number)) : undefined;
        await notifyCustomerCalled(updated.telegram_chat_id, shopName, updated.number, updated.recall_count, updated.customer_phone || undefined, waLink);
      } catch {}
    }

    // WhatsApp API notification (if token + phone number ID configured)
    if (settings?.whatsapp_enabled && settings?.whatsapp_access_token && settings?.whatsapp_business_account_id && updated.customer_phone) {
      try {
        const { sendWhatsAppMessage } = await import("./whatsapp");
        const isRecall = updated.recall_count > 0;
        const msg = isRecall
          ? `🔔🔔 إعادة نداء!\n\nرقم ${updated.number} — تفضل إلى ${shopName} 🏪\n\n📌 تمت مناداتك ${updated.recall_count + 1} مرات`
          : `🔔 حان دورك!\n\nرقم ${updated.number} — تفضل إلى ${shopName} 🏪\n\n🎉 دورك جه! يرجى التوجه الآن`;
        await sendWhatsAppMessage(updated.customer_phone, msg, settings.whatsapp_access_token, settings.whatsapp_business_account_id);
      } catch {}
    }
  }

  return updated;
}

// ─── Settings ─────────────────────────────────────

export async function getQueueSettings(shopId: string): Promise<QueueSettings | undefined> {
  return getOrSet(`queue_settings:${shopId}`, 10_000, async () => {
    const rows = await sql`SELECT * FROM queue_settings WHERE shop_id = ${shopId}` as unknown as QueueSettings[];
    if (rows.length > 0) return rows[0];
    // Auto-create default settings if missing
    try {
      await sql`INSERT INTO queue_settings (shop_id) VALUES (${shopId})`;
      const created = await sql`SELECT * FROM queue_settings WHERE shop_id = ${shopId}` as unknown as QueueSettings[];
      return created[0];
    } catch {
      return undefined;
    }
  });
}

export async function updateQueueSettings(
  shopId: string,
  data: Partial<QueueSettings>
): Promise<QueueSettings | undefined> {
  const keys = Object.keys(data).filter(k => k !== "shop_id");
  if (keys.length === 0) return getQueueSettings(shopId);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => (data as any)[k]);
  const query = `UPDATE queue_settings SET ${setClauses.join(", ")} WHERE shop_id = $${keys.length + 1}`;
  const result = await sql.query(query, [...values, shopId]);
  invalidate(`queue_settings:${shopId}`);
  return getQueueSettings(shopId);
}

// ─── Counters ──────────────────────────────────────

export async function getCounters(shopId: string): Promise<Counter[]> {
  return await sql`SELECT * FROM counters WHERE shop_id = ${shopId} AND is_active = true ORDER BY created_at ASC` as unknown as Counter[];
}

export async function createCounter(shopId: string, name: string): Promise<Counter | undefined> {
  const id = uuidv4();
  await sql`INSERT INTO counters (id, shop_id, name) VALUES (${id}, ${shopId}, ${name})`;
  const rows = await sql`SELECT * FROM counters WHERE id = ${id}` as unknown as Counter[];
  return rows[0];
}

export async function deleteCounter(id: string): Promise<void> {
  await sql`UPDATE counters SET is_active = 0 WHERE id = ${id}`;
}

export async function getCounter(id: string): Promise<Counter | undefined> {
  const rows = await sql`SELECT * FROM counters WHERE id = ${id}` as unknown as Counter[];
  return rows[0];
}

// ─── Stats ────────────────────────────────────────

export async function getTodayCustomerCount(shopId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM queue_entries 
    WHERE shop_id = ${shopId} AND DATE(created_at) = CURRENT_DATE
  ` as unknown as { count: number }[];
  return rows[0]?.count || 0;
}

export async function getQueueStats(shopId: string) {
  const waiting = await sql`
    SELECT COUNT(*)::int as count FROM queue_entries 
    WHERE shop_id = ${shopId} AND status = 'waiting'
  ` as unknown as { count: number }[];

  const today = await sql`
    SELECT COUNT(*)::int as count FROM queue_entries 
    WHERE shop_id = ${shopId} AND DATE(created_at) = CURRENT_DATE
  ` as unknown as { count: number }[];

  const avgWait = await sql`
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - created_at)) / 60), 0)::int as avg_min 
    FROM queue_entries 
    WHERE shop_id = ${shopId} AND called_at IS NOT NULL AND DATE(created_at) = CURRENT_DATE
  ` as unknown as { avg_min: number }[];

  const peakHours = await sql`
    SELECT TO_CHAR(created_at, 'HH24') as hour, COUNT(*)::int as count
    FROM queue_entries 
    WHERE shop_id = ${shopId} AND DATE(created_at) = CURRENT_DATE
    GROUP BY hour ORDER BY count DESC LIMIT 3
  `;

  return {
    waiting: waiting[0]?.count || 0,
    today_total: today[0]?.count || 0,
    avg_wait_minutes: Math.round(avgWait[0]?.avg_min || 0),
    peak_hours: peakHours,
  };
}

// ─── Ratings ────────────────────────────────────

export async function addRating(data: {
  shopId: string;
  entryId?: string;
  rating: number;
  comment?: string;
  customerName?: string;
}): Promise<Rating> {
  const id = uuidv4();
  await sql`
    INSERT INTO ratings (id, shop_id, entry_id, rating, comment, customer_name)
    VALUES (${id}, ${data.shopId}, ${data.entryId || null}, ${data.rating}, ${data.comment || ""}, ${data.customerName || ""})
  `;
  const rows = await sql`SELECT * FROM ratings WHERE id = ${id}` as unknown as Rating[];
  return rows[0];
}

export async function getShopRatings(shopId: string, limit: number = 50): Promise<Rating[]> {
  return await sql`
    SELECT * FROM ratings WHERE shop_id = ${shopId} ORDER BY created_at DESC LIMIT ${limit}
  ` as unknown as Rating[];
}

export async function getShopAverageRating(shopId: string): Promise<{ average: number; count: number }> {
  const rows = await sql`
    SELECT COALESCE(AVG(rating), 0)::real as average, COUNT(*)::int as count
    FROM ratings WHERE shop_id = ${shopId}
  ` as unknown as { average: number; count: number }[];
  return {
    average: Math.round((rows[0]?.average || 0) * 10) / 10,
    count: rows[0]?.count || 0,
  };
}

// ─── Payment Methods ───────────────────────────

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return await sql`SELECT * FROM payment_methods ORDER BY sort_order ASC` as unknown as PaymentMethod[];
}

export async function getActivePaymentMethods(): Promise<PaymentMethod[]> {
  return await sql`SELECT * FROM payment_methods WHERE is_active = true ORDER BY sort_order ASC` as unknown as PaymentMethod[];
}

export async function addPaymentMethod(data: { name: string; type: string; details: string; icon?: string }): Promise<PaymentMethod> {
  const id = uuidv4();
  const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), 0)::int as max FROM payment_methods` as unknown as { max: number }[];
  await sql`
    INSERT INTO payment_methods (id, name, type, details, icon, sort_order) 
    VALUES (${id}, ${data.name}, ${data.type}, ${data.details}, ${data.icon || "💳"}, ${(maxOrder[0]?.max || 0) + 1})
  `;
  const rows = await sql`SELECT * FROM payment_methods WHERE id = ${id}` as unknown as PaymentMethod[];
  return rows[0];
}

export async function updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
  const keys = Object.keys(data).filter(k => k !== "id");
  if (keys.length === 0) {
    const rows = await sql`SELECT * FROM payment_methods WHERE id = ${id}` as unknown as PaymentMethod[];
    return rows[0];
  }
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => (data as any)[k]);
  const query = `UPDATE payment_methods SET ${setClauses.join(", ")} WHERE id = $${keys.length + 1}`;
  const result = await sql.query(query, [...values, id]);
  const rows = await sql`SELECT * FROM payment_methods WHERE id = ${id}` as unknown as PaymentMethod[];
  return rows[0];
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM payment_methods WHERE id = ${id}`;
  return result.length > 0; // neon returns array of results
}

// ─── Synchronous wrappers for API routes that need sync access ──────
// These cache the result after first call (only used at module load)
let _migrated = false;
export async function ensureMigrated() {
  if (!_migrated) {
    await runMigrations();
    _migrated = true;
  }
}

// ─── App Settings ────────────────────────────

export async function getAppSetting(key: string): Promise<string> {
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}` as unknown as { value: string }[];
  return rows[0]?.value || "";
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await sql`INSERT INTO app_settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value}`;
}

// ─── Email login code ─────────────────────────

export async function saveLoginCode(email: string, code: string): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${"login_code_" + email}, ${code})
    ON CONFLICT (key) DO UPDATE SET value = ${code}
  `;
}

export async function verifyLoginCode(email: string, code: string): Promise<boolean> {
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${"login_code_" + email}` as unknown as { value: string }[];
  return rows[0]?.value === code;
}

// ─── Booking Slots ────────────────────────────

export async function getBookingSlots(shopId: string): Promise<BookingSlot[]> {
  return await sql`SELECT * FROM booking_slots WHERE shop_id = ${shopId} AND is_active = true ORDER BY day_of_week, start_time` as unknown as BookingSlot[];
}

export async function getBookingSlotsByDay(shopId: string, dayOfWeek: number): Promise<BookingSlot[]> {
  return await sql`SELECT * FROM booking_slots WHERE shop_id = ${shopId} AND day_of_week = ${dayOfWeek} AND is_active = true ORDER BY start_time` as unknown as BookingSlot[];
}

export async function createBookingSlot(data: {
  shopId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<BookingSlot | undefined> {
  const id = uuidv4();
  await sql`INSERT INTO booking_slots (id, shop_id, day_of_week, start_time, end_time) VALUES (${id}, ${data.shopId}, ${data.dayOfWeek}, ${data.startTime}, ${data.endTime})`;
  const rows = await sql`SELECT * FROM booking_slots WHERE id = ${id}` as unknown as BookingSlot[];
  return rows[0];
}

export async function deleteBookingSlot(id: string): Promise<void> {
  await sql`DELETE FROM booking_slots WHERE id = ${id}`;
}

// ─── Bookings ────────────────────────────────

export async function getAvailableSlots(shopId: string, date: string): Promise<Array<{
  slot: BookingSlot;
  available: number;
  total: number;
}>> {
  // Get day of week for the date (0=Sunday)
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay();

  // Get active slots for this day
  const slots = await getBookingSlotsByDay(shopId, dayOfWeek);
  if (slots.length === 0) return [];

  // Get settings for max bookings per slot
  const settings = await getQueueSettings(shopId);
  const maxPerSlot = settings?.max_bookings_per_slot || 5;

  const results: Array<{ slot: BookingSlot; available: number; total: number }> = [];

  for (const slot of slots) {
    // Count existing bookings for this slot on this date
    const countRows = await sql`
      SELECT COUNT(*)::int as count FROM bookings 
      WHERE slot_id = ${slot.id} AND booking_date = ${date} AND status = 'confirmed'
    ` as unknown as { count: number }[];
    const booked = countRows[0]?.count || 0;

    results.push({
      slot,
      available: Math.max(0, maxPerSlot - booked),
      total: maxPerSlot,
    });
  }

  return results;
}

export async function createBooking(data: {
  shopId: string;
  slotId: string;
  bookingDate: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}): Promise<{ booking: Booking; position: number } | { error: string }> {
  // Check if shop allows booking
  const settings = await getQueueSettings(data.shopId);
  if (!settings || settings.booking_enabled === 0) {
    return { error: "الحجز غير متاح حالياً في هذا المحل" };
  }

  // Check if slot exists and is active
  const slots = await sql`SELECT * FROM booking_slots WHERE id = ${data.slotId} AND is_active = true` as unknown as BookingSlot[];
  if (slots.length === 0) {
    return { error: "هذا الموعد غير متاح" };
  }

  // Check availability
  const maxPerSlot = settings.max_bookings_per_slot || 5;
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM bookings 
    WHERE slot_id = ${data.slotId} AND booking_date = ${data.bookingDate} AND status = 'confirmed'
  ` as unknown as { count: number }[];
  const booked = countRows[0]?.count || 0;

  if (booked >= maxPerSlot) {
    return { error: "هذا الموعد ممتلأ. اختر موعداً آخر." };
  }

  // Check if phone already booked this slot on same date
  if (data.customerPhone) {
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, "");
    const existing = await sql`
      SELECT id FROM bookings 
      WHERE shop_id = ${data.shopId} AND booking_date = ${data.bookingDate} 
      AND slot_id = ${data.slotId} AND customer_phone = ${cleanPhone} AND status = 'confirmed'
    `;
    if (existing.length > 0) {
      return { error: "لديك حجز في هذا الموعد بالفعل" };
    }
  }

  // Create booking
  const id = uuidv4();
  const queueNumber = booked + 1;
  await sql`
    INSERT INTO bookings (id, shop_id, slot_id, booking_date, customer_name, customer_phone, notes, queue_number)
    VALUES (${id}, ${data.shopId}, ${data.slotId}, ${data.bookingDate}, ${data.customerName || ""}, ${data.customerPhone || ""}, ${data.notes || ""}, ${queueNumber})
  `;

  const booking = await sql`SELECT * FROM bookings WHERE id = ${id}` as unknown as Booking[];

  return {
    booking: booking[0],
    position: queueNumber,
  };
}

export async function getShopBookings(shopId: string, date?: string): Promise<Booking[]> {
  if (date) {
    return await sql`
      SELECT b.*, bs.start_time, bs.end_time, bs.day_of_week 
      FROM bookings b 
      JOIN booking_slots bs ON b.slot_id = bs.id 
      WHERE b.shop_id = ${shopId} AND b.booking_date::date = ${date}::date
      AND b.status IN ('confirmed', 'pending', 'waiting')
      ORDER BY bs.start_time, b.created_at
    ` as unknown as Booking[];
  }
  return await sql`
    SELECT b.*, bs.start_time, bs.end_time, bs.day_of_week 
    FROM bookings b 
    JOIN booking_slots bs ON b.slot_id = bs.id 
    WHERE b.shop_id = ${shopId} AND b.status IN ('confirmed', 'pending', 'waiting')
    AND b.booking_date >= CURRENT_DATE
    ORDER BY b.booking_date, bs.start_time
  ` as unknown as Booking[];
}

export async function cancelBooking(id: string): Promise<Booking | undefined> {
  await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id}`;
  const rows = await sql`SELECT * FROM bookings WHERE id = ${id}` as unknown as Booking[];
  return rows[0];
}

export async function completeBooking(id: string): Promise<Booking | undefined> {
  await sql`UPDATE bookings SET status = 'completed' WHERE id = ${id}`;
  const rows = await sql`SELECT * FROM bookings WHERE id = ${id}` as unknown as Booking[];
  return rows[0];
}

export async function getBookingStats(shopId: string) {
  const today = await sql`
    SELECT COUNT(*)::int as count FROM bookings 
    WHERE shop_id = ${shopId} AND booking_date = CURRENT_DATE AND status = 'confirmed'
  ` as unknown as { count: number }[];

  const upcoming = await sql`
    SELECT COUNT(*)::int as count FROM bookings 
    WHERE shop_id = ${shopId} AND booking_date >= CURRENT_DATE AND status = 'confirmed'
  ` as unknown as { count: number }[];

  return {
    today_count: today[0]?.count || 0,
    upcoming_count: upcoming[0]?.count || 0,
  };
}

// ─── SSE Event Bus ──────────────────────────────

type ShopCallback = (message: string) => void;
const shopSubscribers = new Map<string, Set<ShopCallback>>();

export function subscribeToShop(shopId: string, callback: ShopCallback): () => void {
  if (!shopSubscribers.has(shopId)) {
    shopSubscribers.set(shopId, new Set());
  }
  shopSubscribers.get(shopId)!.add(callback);
  return () => {
    shopSubscribers.get(shopId)?.delete(callback);
    if (shopSubscribers.get(shopId)?.size === 0) {
      shopSubscribers.delete(shopId);
    }
  };
}

export function publishToShop(shopId: string, event: string, data: unknown) {
  const subs = shopSubscribers.get(shopId);
  if (!subs || subs.size === 0) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  subs.forEach((cb) => {
    try { cb(message); } catch { /* subscriber disconnected */ }
  });
}
