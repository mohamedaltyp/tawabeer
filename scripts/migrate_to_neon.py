"""
انقل بيانات SQLite المحلي (data.db) إلى Neon PostgreSQL
"""
import sqlite3
import pg8000
import re
from datetime import datetime

PASSWORD = open("C:\\Users\\admin\\neon_pass").read().strip()
DATABASE_URL = f"postgresql://neondb_owner:{PASSWORD}@ep-cold-recipe-abnxgw34-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"

def slugify(name):
    s = re.sub(r'[^a-zA-Z0-9\u0600-\u06FF\s-]', '', name or '')
    s = re.sub(r'\s+', '-', s.strip().lower())[:50]
    return s or 'shop'

def main():
    cfg = parse_url(DATABASE_URL)
    print(f"🔌 Connecting to Neon ({cfg['host']})...")
    conn = pg8000.connect(**cfg)
    conn.autocommit = True
    cur = conn.cursor()

    # ─── Add columns to existing tables ───
    print("\n🔧 Fixing schema...")
    add_cols(cur, "shops", [
        "description TEXT DEFAULT ''",
        "address TEXT DEFAULT ''",
        "phone TEXT DEFAULT ''",
        "category TEXT DEFAULT ''",
        "owner_name TEXT DEFAULT ''",
        "owner_phone TEXT DEFAULT ''",
        "owner_password TEXT DEFAULT ''",
        "plan TEXT DEFAULT 'free'",
        "plan_status TEXT DEFAULT 'active'",
        "plan_started_at TIMESTAMPTZ",
        "plan_expires_at TIMESTAMPTZ",
        "stripe_customer_id TEXT DEFAULT ''",
        "stripe_subscription_id TEXT DEFAULT ''",
    ])
    add_cols(cur, "queue_entries", [
        "estimated_wait INTEGER DEFAULT 0",
        "recall_count INTEGER DEFAULT 0",
        "telegram_chat_id TEXT DEFAULT ''",
        "counter_id TEXT DEFAULT ''",
    ])
    add_cols(cur, "queue_settings", [
        "avg_service_minutes REAL DEFAULT 10",
        "greeting_message TEXT DEFAULT 'مرحباً بك!'",
        "whatsapp_enabled INTEGER DEFAULT 0",
        "whatsapp_number TEXT DEFAULT ''",
        "whatsapp_business_account_id TEXT DEFAULT ''",
        "booking_enabled INTEGER DEFAULT 0",
        "slot_duration_minutes INTEGER DEFAULT 30",
        "max_bookings_per_slot INTEGER DEFAULT 5",
        "booking_advance_days INTEGER DEFAULT 7",
    ])
    add_cols(cur, "notifications", ["sent_at TIMESTAMPTZ"])

    # ─── Create missing tables ───
    print("\n📦 Creating missing tables...")
    for sql in TABLES_SQL:
        cur.execute(sql)
    print("  ✅ All tables ready")

    # ─── Verify shops columns ───
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='shops' ORDER BY ordinal_position")
    safe_cols = [r[0] for r in cur.fetchall()]

    # ─── Migrate data ───
    print("\n🚚 Migrating data...")
    local = sqlite3.connect("data.db")
    local.row_factory = sqlite3.Row

    # Shops
    rows = local.execute("SELECT * FROM shops").fetchall()
    print(f"  Shops: {len(rows)} rows")
    for r in rows:
        d = dict(r)
        cur.execute("SELECT id FROM shops WHERE id = %s", (d['id'],))
        if cur.fetchone() is not None:
            print(f"    ⏭️ Shop '{d.get('name','?')}' already exists")
            continue
        
        # Build with all columns that exist in Neon
        vals = {}
        for col in safe_cols:
            if col == 'slug':
                vals['slug'] = slugify(d.get('name', ''))
            elif col == 'currency':
                vals['currency'] = 'EGP'
            elif col == 'timezone':
                vals['timezone'] = 'Africa/Cairo'
            elif col == 'language':
                vals['language'] = 'ar'
            elif col == 'avatar_emoji':
                vals['avatar_emoji'] = '📌'
            elif col == 'location_city':
                vals['location_city'] = ''
            elif col == 'location_country':
                vals['location_country'] = ''
            elif col in d:
                vals[col] = d[col]
            elif col in ['plan_started_at', 'plan_expires_at', 'called_at', 'completed_at', 'sent_at']:
                vals[col] = None
            elif col == 'password':
                vals['password'] = d.get('owner_password', '')
            elif col == 'created_at':
                vals['created_at'] = d.get('created_at', datetime.now().isoformat())
            elif col == 'is_active':
                vals['is_active'] = d.get('is_active', 1)
            else:
                vals[col] = ''

        cols_str = ', '.join(vals.keys())
        placeholders = ', '.join(['%s'] * len(vals))
        sql = f"INSERT INTO shops ({cols_str}) VALUES ({placeholders})"
        cur.execute(sql, list(vals.values()))
        print(f"    ✅ Shop '{d.get('name','?')}' ({d['id'][:8]}...)")

    # Queue entries
    rows = local.execute("SELECT * FROM queue_entries").fetchall()
    print(f"  Queue entries: {len(rows)} rows")
    for r in rows:
        d = dict(r)
        cur.execute("SELECT id FROM queue_entries WHERE id = %s", (d['id'],))
        if cur.fetchone() is None:
            cur.execute("""
                INSERT INTO queue_entries (id, shop_id, number, customer_name, customer_phone,
                    status, estimated_wait, recall_count, created_at, called_at, completed_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (d['id'], d['shop_id'], d['number'], d.get('customer_name',''),
                  d.get('customer_phone',''), d.get('status','waiting'),
                  d.get('estimated_wait',0), d.get('recall_count',0),
                  d.get('created_at', datetime.now().isoformat()),
                  d.get('called_at'), d.get('completed_at')))
    print(f"    ✅ {len(rows)} queue entries done")

    # Queue settings
    rows = local.execute("SELECT * FROM queue_settings").fetchall()
    print(f"  Queue settings: {len(rows)} rows")
    for r in rows:
        d = dict(r)
        cur.execute("SELECT shop_id FROM queue_settings WHERE shop_id = %s", (d['shop_id'],))
        if cur.fetchone() is None:
            cur.execute("""
                INSERT INTO queue_settings (shop_id, avg_service_minutes, is_open,
                    greeting_message, whatsapp_enabled, whatsapp_number,
                    whatsapp_business_account_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (d['shop_id'], d.get('avg_service_minutes',10), d.get('is_open',1),
                  d.get('greeting_message',''), d.get('whatsapp_enabled',0),
                  d.get('whatsapp_number',''), d.get('whatsapp_business_account_id','')))
    print(f"    ✅ {len(rows)} settings done")

    # Notifications (empty, skip)
    rows = local.execute("SELECT * FROM notifications").fetchall()
    print(f"  Notifications: {len(rows)} rows (empty, skipped)")

    local.close()
    cur.close()
    conn.close()
    print("\n🎉 Migration complete!")

def parse_url(url):
    rest = url.split("://", 1)[1]
    user_pass, rest = rest.split("@", 1)
    user, password = user_pass.split(":", 1)
    host_port, db = rest.split("/", 1)
    db = db.split("?")[0]
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host = host_port
        port = 5432
    return {"user": user, "password": password, "host": host, "port": port, "database": db}

def add_cols(cur, table, cols):
    for col in cols:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col}")
        except:
            pass
    print(f"  ✅ {table} columns checked")

TABLES_SQL = [
    """CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other',
        details TEXT NOT NULL DEFAULT '', icon TEXT DEFAULT '💳',
        is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW())""",
    """CREATE TABLE IF NOT EXISTS counters (
        id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT 'شباك 1',
        current_number INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE)""",
    """CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')""",
    """CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, entry_id TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '', customer_name TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE)""",
    """CREATE TABLE IF NOT EXISTS booking_slots (
        id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL, end_time TEXT NOT NULL, is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE)""",
    """CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, slot_id TEXT NOT NULL,
        booking_date DATE NOT NULL, customer_name TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '', status TEXT DEFAULT 'confirmed',
        notes TEXT DEFAULT '', counter_id TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (slot_id) REFERENCES booking_slots(id) ON DELETE CASCADE)""",
]

if __name__ == "__main__":
    main()
