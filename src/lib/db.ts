import Database from "better-sqlite3";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.join(process.cwd(), "data.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// Run migrations for existing tables
function runMigrations() {
  // Add plan columns to shops table if they don't exist
  try {
    db.exec("ALTER TABLE shops ADD COLUMN plan TEXT DEFAULT 'free'");
  } catch {} // already exists
  try {
    db.exec("ALTER TABLE shops ADD COLUMN plan_status TEXT DEFAULT 'active'");
  } catch {}
  try {
    db.exec("ALTER TABLE shops ADD COLUMN plan_started_at TEXT");
  } catch {}
  try {
    db.exec("ALTER TABLE shops ADD COLUMN plan_expires_at TEXT");
  } catch {}
  try {
    db.exec("ALTER TABLE shops ADD COLUMN stripe_customer_id TEXT DEFAULT ''");
  } catch {}
  try {
    db.exec("ALTER TABLE shops ADD COLUMN stripe_subscription_id TEXT DEFAULT ''");
  } catch {}
  // WhatsApp columns in queue_settings
  try {
    db.exec("ALTER TABLE queue_settings ADD COLUMN whatsapp_enabled INTEGER DEFAULT 0");
  } catch {}
  try {
    db.exec("ALTER TABLE queue_settings ADD COLUMN whatsapp_number TEXT DEFAULT ''");
  } catch {}
  try {
    db.exec("ALTER TABLE queue_settings ADD COLUMN whatsapp_business_account_id TEXT DEFAULT ''");
  } catch {}
  // recall_count for queue_entries
  try {
    db.exec("ALTER TABLE queue_entries ADD COLUMN recall_count INTEGER DEFAULT 0");
  } catch {}
}
runMigrations();

// Create tables
db.exec(`
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
    plan_started_at TEXT,
    plan_expires_at TEXT,
    stripe_customer_id TEXT DEFAULT '',
    stripe_subscription_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS queue_entries (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    status TEXT DEFAULT 'waiting',
    estimated_wait INTEGER DEFAULT 0,
    recall_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    called_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS queue_settings (
    shop_id TEXT PRIMARY KEY,
    avg_service_minutes REAL DEFAULT 10,
    is_open INTEGER DEFAULT 1,
    greeting_message TEXT DEFAULT 'مرحباً بك!',
    whatsapp_enabled INTEGER DEFAULT 0,
    whatsapp_number TEXT DEFAULT '',
    whatsapp_business_account_id TEXT DEFAULT '',
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    type TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'pending',
    recipient TEXT DEFAULT '',
    message TEXT DEFAULT '',
    sent_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES queue_entries(id) ON DELETE CASCADE
  );
`);

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

// ─── Shops ────────────────────────────────────────

export function createShop(data: {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_password?: string;
}): Shop {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO shops (id, name, description, address, phone, category, owner_name, owner_phone, owner_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.name,
    data.description || "",
    data.address || "",
    data.phone || "",
    data.category || "",
    data.owner_name || "",
    data.owner_phone || "",
    data.owner_password || ""
  );

  // Create default settings
  db.prepare(`INSERT INTO queue_settings (shop_id) VALUES (?)`).run(id);

  return getShop(id)!;
}

export function getAllShops(): Shop[] {
  return db.prepare("SELECT * FROM shops WHERE is_active = 1 ORDER BY name").all() as Shop[];
}

export function getShop(id: string): Shop | undefined {
  return db.prepare("SELECT * FROM shops WHERE id = ?").get(id) as Shop | undefined;
}

export function updateShop(id: string, data: Partial<Shop>): Shop | undefined {
  const fields = Object.keys(data)
    .filter((k) => k !== "id")
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.entries(data)
    .filter(([k]) => k !== "id")
    .map(([, v]) => v);
  if (fields) {
    db.prepare(`UPDATE shops SET ${fields} WHERE id = ?`).run(...values, id);
  }
  return getShop(id);
}

// ─── Plans / Subscriptions ───────────────────────

export function getOwnerShopsByPhone(ownerPhone: string): Shop[] {
  return db
    .prepare("SELECT * FROM shops WHERE owner_phone = ? ORDER BY created_at DESC")
    .all(ownerPhone) as Shop[];
}

export function getShopPlan(shopId: string): string {
  const shop = getShop(shopId);
  return shop?.plan || "free";
}

export function updateShopPlan(
  shopId: string,
  plan: string,
  expiresAt?: string
): Shop | undefined {
  const updates: Record<string, any> = { plan };
  if (expiresAt) {
    updates.plan_expires_at = expiresAt;
    updates.plan_status = "active";
    updates.plan_started_at = new Date().toISOString();
  }
  return updateShop(shopId, updates);
}

export function isPlanActive(shopId: string): boolean {
  const shop = getShop(shopId);
  if (!shop) return false;
  if (shop.plan === "free") return true;
  if (shop.plan_status !== "active") return false;
  if (shop.plan_expires_at && new Date(shop.plan_expires_at) < new Date()) {
    return false;
  }
  return true;
}

// ─── Queue (legacy) ────────────────────────────────────────

export function getNextNumber(shopId: string): number {
  const row = db
    .prepare("SELECT MAX(number) as max_num FROM queue_entries WHERE shop_id = ?")
    .get(shopId) as { max_num: number | null };
  return (row?.max_num || 0) + 1;
}

export function joinQueue(data: {
  shopId: string;
  customerName?: string;
  customerPhone?: string;
}): { entry: QueueEntry; position: number; estimatedWait: number } {
  const number = getNextNumber(data.shopId);
  const id = uuidv4();

  // Get active queue count for position
  const waitingCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM queue_entries WHERE shop_id = ? AND status = 'waiting'"
    )
    .get(data.shopId) as { count: number };

  const position = waitingCount.count + 1;

  // Get average service time for estimate
  const settings = db
    .prepare("SELECT * FROM queue_settings WHERE shop_id = ?")
    .get(data.shopId) as QueueSettings | undefined;
  const avgMinutes = settings?.avg_service_minutes || 10;

  const estimatedWait = position * avgMinutes;

  db.prepare(`
    INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone, estimated_wait)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.shopId, number, data.customerName || "", data.customerPhone || "", estimatedWait);

  // Update shop current number if this is the first entry
  const shop = getShop(data.shopId);
  if (shop && shop.current_number === 0) {
    db.prepare("UPDATE shops SET current_number = ? WHERE id = ?").run(number, data.shopId);
  }

  return {
    entry: getQueueEntry(id)!,
    position,
    estimatedWait,
  };
}

export function getQueueEntries(shopId: string): QueueEntry[] {
  return db
    .prepare(
      "SELECT * FROM queue_entries WHERE shop_id = ? ORDER BY number ASC"
    )
    .all(shopId) as QueueEntry[];
}

export function getActiveQueue(shopId: string): QueueEntry[] {
  return db
    .prepare(
      "SELECT * FROM queue_entries WHERE shop_id = ? AND status = 'waiting' ORDER BY number ASC"
    )
    .all(shopId) as QueueEntry[];
}

export function getQueueEntry(id: string): QueueEntry | undefined {
  return db.prepare("SELECT * FROM queue_entries WHERE id = ?").get(id) as
    | QueueEntry
    | undefined;
}

export function callNext(shopId: string): QueueEntry | null {
  const next = db
    .prepare(
      "SELECT * FROM queue_entries WHERE shop_id = ? AND status = 'waiting' ORDER BY number ASC LIMIT 1"
    )
    .get(shopId) as QueueEntry | undefined;

  if (!next) return null;

  db.prepare(
    "UPDATE queue_entries SET status = 'called', called_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(next.id);

  db.prepare("UPDATE shops SET current_number = ? WHERE id = ?").run(
    next.number,
    shopId
  );

  return getQueueEntry(next.id)!;
}

export function completeEntry(id: string): QueueEntry | undefined {
  db.prepare(
    "UPDATE queue_entries SET status = 'completed', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(id);
  return getQueueEntry(id);
}

export function cancelEntry(id: string): QueueEntry | undefined {
  db.prepare(
    "UPDATE queue_entries SET status = 'cancelled' WHERE id = ?"
  ).run(id);
  return getQueueEntry(id);
}

export function callAgain(id: string): QueueEntry | undefined {
  const entry = getQueueEntry(id);
  if (!entry) return undefined;
  db.prepare(
    "UPDATE queue_entries SET status = 'called', called_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), recall_count = recall_count + 1 WHERE id = ?"
  ).run(id);
  // نحدث رقم الخدمة الحالي في المحل
  db.prepare("UPDATE shops SET current_number = ? WHERE id = ?").run(entry.number, entry.shop_id);
  return getQueueEntry(id);
}

// ─── Settings ─────────────────────────────────────

export function getQueueSettings(shopId: string): QueueSettings | undefined {
  return db.prepare("SELECT * FROM queue_settings WHERE shop_id = ?").get(
    shopId
  ) as QueueSettings | undefined;
}

export function updateQueueSettings(
  shopId: string,
  data: Partial<QueueSettings>
): QueueSettings | undefined {
  const fields = Object.keys(data)
    .filter((k) => k !== "shop_id")
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.entries(data)
    .filter(([k]) => k !== "shop_id")
    .map(([, v]) => v);
  if (fields) {
    db.prepare(`UPDATE queue_settings SET ${fields} WHERE shop_id = ?`).run(
      ...values,
      shopId
    );
  }
  return getQueueSettings(shopId);
}

// ─── Stats ────────────────────────────────────────

export function getTodayCustomerCount(shopId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM queue_entries WHERE shop_id = ? AND date(created_at) = date('now')"
    )
    .get(shopId) as { count: number };
  return row.count;
}

export function getQueueStats(shopId: string) {
  const waiting = db
    .prepare(
      "SELECT COUNT(*) as count FROM queue_entries WHERE shop_id = ? AND status = 'waiting'"
    )
    .get(shopId) as { count: number };

  const today = db
    .prepare(
      "SELECT COUNT(*) as count FROM queue_entries WHERE shop_id = ? AND date(created_at) = date('now')"
    )
    .get(shopId) as { count: number };

  const avgWait = db
    .prepare(
      "SELECT AVG((julianday(called_at) - julianday(created_at)) * 24 * 60) as avg_min FROM queue_entries WHERE shop_id = ? AND called_at IS NOT NULL AND date(created_at) = date('now')"
    )
    .get(shopId) as { avg_min: number | null };

  const peakHours = db
    .prepare(
      `SELECT strftime('%H', created_at) as hour, COUNT(*) as count
       FROM queue_entries WHERE shop_id = ? AND date(created_at) = date('now')
       GROUP BY hour ORDER BY count DESC LIMIT 3`
    )
    .all(shopId) as { hour: string; count: number }[];

  return {
    waiting: waiting.count,
    today_total: today.count,
    avg_wait_minutes: Math.round(avgWait?.avg_min || 0),
    peak_hours: peakHours,
  };
}

// ─── SSE Event Emitter ────────────────────────────

type SSECallback = (data: any) => void;
const sseClients = new Map<string, Set<SSECallback>>();

export function subscribeToShop(shopId: string, callback: SSECallback): () => void {
  if (!sseClients.has(shopId)) {
    sseClients.set(shopId, new Set());
  }
  sseClients.get(shopId)!.add(callback);

  return () => {
    sseClients.get(shopId)?.delete(callback);
    if (sseClients.get(shopId)?.size === 0) {
      sseClients.delete(shopId);
    }
  };
}

export function emitShopEvent(shopId: string, event: string, data: any) {
  const clients = sseClients.get(shopId);
  if (clients) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach((cb) => cb(message));
  }
}
