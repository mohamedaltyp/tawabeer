import { neon, neonConfig } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";

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
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
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
    `ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS recall_count INTEGER DEFAULT 0`,
  ];
  for (const m of migrations) {
    try { await sql.unsafe(m); } catch { /* column already exists */ }
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
  await sql`
    INSERT INTO shops (id, name, description, address, phone, category, owner_name, owner_phone, owner_password)
    VALUES (${id}, ${data.name}, ${data.description || ""}, ${data.address || ""}, ${data.phone || ""}, ${data.category || ""}, ${data.owner_name || ""}, ${data.owner_phone || ""}, ${data.owner_password || ""})
  `;
  await sql`INSERT INTO queue_settings (shop_id) VALUES (${id})`;
  return getShop(id)!;
}

export async function getAllShops(): Promise<Shop[]> {
  return await sql`SELECT * FROM shops WHERE is_active = 1 ORDER BY name` as unknown as Shop[];
}

export async function getShop(id: string): Promise<Shop | undefined> {
  const rows = await sql`SELECT * FROM shops WHERE id = ${id}` as unknown as Shop[];
  return rows[0];
}

export async function updateShop(id: string, data: Partial<Shop>): Promise<Shop | undefined> {
  const keys = Object.keys(data).filter(k => k !== "id");
  if (keys.length === 0) return getShop(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => (data as any)[k]);
  const query = `UPDATE shops SET ${setClauses.join(", ")} WHERE id = $${keys.length + 1}`;
  const result = await sql.query(query, [...values, id]);
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
}): Promise<{ entry: QueueEntry; position: number; estimatedWait: number }> {
  const number = await getNextNumber(data.shopId);
  const id = uuidv4();

  // Get active queue count for position
  const countRows = await sql`SELECT COUNT(*)::int as count FROM queue_entries WHERE shop_id = ${data.shopId} AND status = 'waiting'` as unknown as { count: number }[];
  const position = countRows[0]?.count || 0;

  // Get average service time
  const settingsRows = await sql`SELECT * FROM queue_settings WHERE shop_id = ${data.shopId}` as unknown as QueueSettings[];
  const avgMinutes = settingsRows[0]?.avg_service_minutes || 10;
  const estimatedWait = (position + 1) * avgMinutes;

  await sql`
    INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone, estimated_wait)
    VALUES (${id}, ${data.shopId}, ${number}, ${data.customerName || ""}, ${data.customerPhone || ""}, ${estimatedWait})
  `;

  // Update shop current number if this is the first entry
  const shop = await getShop(data.shopId);
  if (shop && shop.current_number === 0) {
    await sql`UPDATE shops SET current_number = ${number} WHERE id = ${data.shopId}`;
  }

  const entry = await getQueueEntry(id);
  return {
    entry: entry!,
    position: position + 1,
    estimatedWait,
  };
}

export async function getQueueEntries(shopId: string): Promise<QueueEntry[]> {
  return await sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} ORDER BY number ASC` as unknown as QueueEntry[];
}

export async function getActiveQueue(shopId: string): Promise<QueueEntry[]> {
  return await sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} AND status = 'waiting' ORDER BY number ASC` as unknown as QueueEntry[];
}

export async function getQueueEntry(id: string): Promise<QueueEntry | undefined> {
  const rows = await sql`SELECT * FROM queue_entries WHERE id = ${id}` as unknown as QueueEntry[];
  return rows[0];
}

export async function callNext(shopId: string): Promise<QueueEntry | null> {
  const rows = await sql`SELECT * FROM queue_entries WHERE shop_id = ${shopId} AND status = 'waiting' ORDER BY number ASC LIMIT 1` as unknown as QueueEntry[];
  const next = rows[0];
  if (!next) return null;

  await sql`UPDATE queue_entries SET status = 'called', called_at = NOW() WHERE id = ${next.id}`;
  await sql`UPDATE shops SET current_number = ${next.number} WHERE id = ${shopId}`;

  return getQueueEntry(next.id) || null;
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
  return getQueueEntry(id);
}

// ─── Settings ─────────────────────────────────────

export async function getQueueSettings(shopId: string): Promise<QueueSettings | undefined> {
  const rows = await sql`SELECT * FROM queue_settings WHERE shop_id = ${shopId}` as unknown as QueueSettings[];
  return rows[0];
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
  return getQueueSettings(shopId);
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

// ─── Payment Methods ───────────────────────────

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return await sql`SELECT * FROM payment_methods ORDER BY sort_order ASC` as unknown as PaymentMethod[];
}

export async function getActivePaymentMethods(): Promise<PaymentMethod[]> {
  return await sql`SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC` as unknown as PaymentMethod[];
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
