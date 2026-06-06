import Database from "better-sqlite3";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.join(process.cwd(), "data.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

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
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
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
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface QueueSettings {
  shop_id: string;
  avg_service_minutes: number;
  is_open: number;
  greeting_message: string;
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

// ─── Queue ────────────────────────────────────────

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
  db.prepare(
    "UPDATE queue_entries SET status = 'called', called_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(id);
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
