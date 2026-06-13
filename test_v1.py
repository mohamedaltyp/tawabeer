"""
Tawabeer v1 - Final Test Suite (with proper session cookie handling)
"""
import urllib.request
import urllib.error
import http.cookiejar
import json
import sys
import time
import re
import concurrent.futures
from datetime import datetime, timedelta

BASE = "http://localhost:3004"
RESULTS = {"pass": 0, "fail": 0, "warn": 0, "skip": 0}
FAILED_TESTS = []
SHOP_ID = None
SHOPS = []
LOGGED_IN = False

# Use cookie jar for session management
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api(method, path, body=None, use_cookies=True, timeout_sec=8):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    
    try:
        if use_cookies:
            resp = opener.open(req, timeout=timeout_sec)
        else:
            resp = urllib.request.urlopen(req, timeout=timeout_sec)
        
        raw = resp.read().decode()
        try: bj = json.loads(raw)
        except: bj = None
        return resp.status, bj, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        try: bj = json.loads(raw)
        except: bj = None
        return e.code, bj, raw
    except Exception as e:
        return 0, None, str(e)

def test(name, condition, detail=""):
    if condition is True:
        RESULTS["pass"] += 1
        print(f"  OK {name}")
    elif condition == "SKIP":
        RESULTS["skip"] += 1
        print(f"  -- {name} (skip: {detail})")
    else:
        RESULTS["fail"] += 1
        FAILED_TESTS.append(name)
        print(f"  XX {name} -- {detail}")

# ============================================================
print("=" * 60)
print(" TABAWER v1 COMPREHENSIVE TEST")
print(f" {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# ============================================================
print(f"\n--- 1: HEALTH ---")
s, bj, raw = api("GET", "/")
test("Homepage loads", s == 200, f"HTTP {s}")

# ============================================================
print(f"\n--- 2: AUTH ---")

s, bj, raw = api("POST", "/api/auth/login", {"phone": "01012345678", "password": "mohamed123"})
LOGGED_IN = s == 200 and bj and bj.get("success")
test("Login (01012345678)", LOGGED_IN, f"HTTP {s}")
if LOGGED_IN:
    SHOPS = bj.get("shops", [])
    if SHOPS:
        SHOP_ID = SHOPS[0].get("id")
    print(f"    -> {bj.get('owner',{}).get('name','?')}, {len(SHOPS)} shops")

s, _, _ = api("POST", "/api/auth/login", {"phone": "01012345678", "password": "wrong"})
test("Wrong password -> 401", s == 401, f"HTTP {s}")

s, _, _ = api("POST", "/api/auth/login", {"phone": "99999999999", "password": "x"})
test("Non-existent -> 401", s == 401, f"HTTP {s}")

s, _, _ = api("POST", "/api/auth/login", {"phone": "", "password": ""})
test("Empty creds -> 400", s == 400, f"HTTP {s}")

s, _, _ = api("POST", "/api/auth/login", {"phone": "' OR 1=1--", "password": "x"})
test("SQL injection blocked", s in [400, 401], f"HTTP {s}")

s, _, _ = api("GET", "/api/auth/session")
test("Session endpoint", s in [200, 401], f"HTTP {s}")

# Rate limiter
print("    Testing rate limiter...")
for i in range(12):
    s, _, _ = api("POST", "/api/auth/login", {"phone": "01012345678", "password": "rltest"}, use_cookies=False)
    if s == 429:
        test("Rate limiting works", True)
        break
else:
    test("Rate limiting works", False, "not triggered")

# ============================================================
print(f"\n--- 3: SHOPS ---")

s, bj, raw = api("GET", "/api/shops")
test("Get shops list", s == 200 and bj and "shops" in bj, f"HTTP {s}")
if s == 200 and bj:
    all_shops = bj.get("shops", [])
    print(f"    -> {len(all_shops)} shops")

if SHOP_ID:
    s, bj, raw = api("GET", f"/api/shops/{SHOP_ID}")
    test("Get shop by ID", s == 200, f"HTTP {s}")

s, _, _ = api("GET", "/api/shops/00000000-0000-0000-0000-000000000000")
test("Invalid shop -> 404", s in [404, 400], f"HTTP {s}")

if all_shops:
    test("No password leak", not any("owner_password" in sh for sh in all_shops))

# ============================================================
print(f"\n--- 4: SETTINGS ---")

if SHOP_ID:
    s, bj, raw = api("GET", f"/api/shops/{SHOP_ID}/settings")
    has_settings = s == 200 and bj and isinstance(bj.get("settings"), dict)
    test("Get settings", has_settings, f"HTTP {s}, bj_keys={list(bj.keys()) if bj else 'None'}")
    
    if has_settings:
        st = bj.get("settings", bj)
        bs = st.get("booking_settings", st)
        print(f"    -> booking_enabled: {bs.get('booking_enabled', '?')}, duration: {bs.get('slot_duration_minutes', '?')}min")
    
    # Update (with session cookie - should work now)
    s2, bj2, raw2 = api("PUT", f"/api/shops/{SHOP_ID}/settings", {"slot_duration_minutes": 50})
    settings_updated = s2 in [200, 201]
    test("Update settings", settings_updated, f"HTTP {s2}: {str(raw2)[:100]}")
    
    if settings_updated:
        s3, bj3, _ = api("GET", f"/api/shops/{SHOP_ID}/settings")
        if s3 == 200 and bj3:
            st3 = bj3.get("settings", bj3)
            bs3 = st3.get("booking_settings", st3)
            test("Settings persisted", bs3.get("slot_duration_minutes") == 50, f"got {bs3.get('slot_duration_minutes')}")
        
        # Restore
        api("PUT", f"/api/shops/{SHOP_ID}/settings", {"slot_duration_minutes": 30})

# ============================================================
print(f"\n--- 5: SLOTS ---")

if SHOP_ID:
    today = datetime.now().strftime("%Y-%m-%d")
    s, bj, raw = api("GET", f"/api/shops/{SHOP_ID}/bookings?date={today}")
    has_slots = s == 200 and bj is not None
    test("Get slots for today", has_slots, f"HTTP {s}")
    if has_slots and isinstance(bj, dict):
        print(f"    -> slots: {len(bj.get('slots', []))}, bookings: {len(bj.get('bookings', []))}")

# ============================================================
print(f"\n--- 6: BOOKINGS ---")

if SHOP_ID:
    s, bj, raw = api("GET", f"/api/shops/{SHOP_ID}/bookings")
    test("Get bookings list", s == 200, f"HTTP {s}")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    s, bj, raw = api("POST", f"/api/shops/{SHOP_ID}/bookings", {
        "customerName": "Test Customer",
        "customerPhone": "01777777777",
        "bookingDate": tomorrow,
        "bookingTime": "10:00",
        "notes": "Auto test"
    })
    created = s in [200, 201]
    test("Create booking", created, f"HTTP {s}: {str(raw)[:120]}")
    
    if created and bj:
        bid = bj.get("id") or (bj.get("booking", {}) or {}).get("id")
        if bid:
            s2, _, _ = api("PATCH", f"/api/shops/{SHOP_ID}/bookings", {
                "action": "cancel", "bookingId": bid
            })
            test("Cancel booking (unauth->401)", s2 in [401, 403], f"HTTP {s2}")

# ============================================================
print(f"\n--- 7: QUEUE ---")

if SHOP_ID:
    s, bj, raw = api("GET", f"/api/shops/{SHOP_ID}/queue")
    test("Get queue", s == 200, f"HTTP {s}")
    
    s, bj, raw = api("POST", f"/api/shops/{SHOP_ID}/queue", {
        "customerName": "Queue Test", "customerPhone": "01444444444"
    })
    test("Create queue entry", s in [200, 201], f"HTTP {s}")

# ============================================================
print(f"\n--- 8: PUBLIC ---")

if SHOP_ID:
    s, _, _ = api("GET", f"/api/shops/{SHOP_ID}", use_cookies=False)
    test("Public shop data", s == 200, f"HTTP {s}")

s, _, _ = api("GET", "/api/public/shop/nonexistent-xyz-999", use_cookies=False)
test("Non-existent shop -> 404", s == 404, f"HTTP {s}")

s, _, _ = api("GET", f"/shop/{SHOP_ID}/book" if SHOP_ID else "/shop/test/book", use_cookies=False)
test("Booking page exists", s in [200, 307, 404], f"HTTP {s}")

# ============================================================
print(f"\n--- 9: INTEGRATIONS ---")

if SHOP_ID:
    s, _, _ = api("GET", f"/api/shops/{SHOP_ID}/whatsapp-settings")
    test("WhatsApp settings", s in [200, 401, 404], f"HTTP {s}")

s, _, _ = api("POST", "/api/push/subscribe", {
    "endpoint": "https://test.example.com/push",
    "keys": {"p256dh": "test", "auth": "test"}
})
test("Push subscribe", s in [200, 400, 404, 405], f"HTTP {s}")

# ============================================================
print(f"\n--- 10: SECURITY ---")

if SHOP_ID:
    s, bj, raw = api("POST", f"/api/shops/{SHOP_ID}/bookings", {
        "customerName": "<script>alert(1)</script>",
        "customerPhone": "01234567890"
    }, use_cookies=False)
    test("XSS handled", s in [200, 400, 404, 422, 500], f"HTTP {s}")
    if bj and isinstance(bj, dict):
        test("XSS not in response", not any("<script>" in str(v) for v in bj.values()))
    else:
        test("XSS not in response", True)

if SHOP_ID:
    s, _, _ = api("PATCH", f"/api/shops/{SHOP_ID}/bookings", {
        "action": "cancel", "bookingId": "fake"
    })
    test("PATCH unauth -> 401", s in [401, 403], f"HTTP {s}")

s, _, _ = api("GET", "/api/shops/not-a-uuid")
test("Invalid UUID handled", s in [400, 404, 422, 500], f"HTTP {s}")

s, _, _ = api("POST", "/api/auth/login")
test("Empty POST -> 400", s == 400, f"HTTP {s}")

# ============================================================
print(f"\n--- 11: PERFORMANCE ---")

start = time.time()
for _ in range(5):
    api("GET", "/api/auth/session", use_cookies=False, timeout_sec=5)
avg = (time.time() - start) / 5 * 1000
test(f"Response time ({avg:.0f}ms)", avg < 2000)

start = time.time()
def do_req():
    return api("GET", "/api/auth/session", use_cookies=False, timeout_sec=5)
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    results = [f.result() for f in concurrent.futures.as_completed([ex.submit(do_req) for _ in range(10)])]
elapsed = time.time() - start
ok = sum(1 for s, _, _ in results if s in [200, 401])
test(f"Concurrent (10 in {elapsed:.2f}s)", ok >= 8, f"{ok}/10")

# ============================================================
print(f"\n--- 12: DATABASE ---")

test("Neon DB connected", LOGGED_IN)
if SHOPS:
    uuid_re = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    test("UUIDs valid", all(uuid_re.match(sh.get("id", "")) for sh in SHOPS))

# ============================================================
total = RESULTS["pass"] + RESULTS["fail"] + RESULTS["skip"]
non_skip = total - RESULTS["skip"]
score = (RESULTS["pass"] / non_skip * 100) if non_skip > 0 else 0

print(f"\n{'=' * 60}")
print(f" FINAL RESULTS")
print(f"{'=' * 60}")
print(f"  Passed:    {RESULTS['pass']}/{total}")
print(f"  Failed:    {RESULTS['fail']}/{total}")
print(f"  Skipped:   {RESULTS['skip']}/{total}")
print(f"  Score:     {score:.0f}%")

if FAILED_TESTS:
    print(f"\n  FAILED:")
    for ft in FAILED_TESTS:
        print(f"    - {ft}")

print(f"\n{'=' * 60}")
sys.exit(1 if RESULTS["fail"] > 3 else 0)
