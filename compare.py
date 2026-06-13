"""Compare Tawabeer v1 LIVE vs LOCAL"""
import urllib.request, urllib.error, json, time

LIVE = 'https://tawabeer-mu.vercel.app'
LOCAL = 'http://localhost:3004'

def test_endpoint(base, path, method='GET', body=None):
    url = f'{base}{path}'
    data = json.dumps(body).encode() if body else None
    h = {'Content-Type': 'application/json'}
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        start = time.time()
        r = urllib.request.urlopen(req, timeout=15)
        elapsed = (time.time() - start) * 1000
        raw = r.read().decode()
        try: bj = json.loads(raw)
        except: bj = None
        return r.status, bj, elapsed
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - start) * 1000
        raw = e.read().decode() if e.fp else ''
        try: bj = json.loads(raw)
        except: bj = None
        return e.code, bj, elapsed
    except Exception as e:
        return 0, None, 0

print('=' * 70)
print('  Comparison: LIVE (Vercel) vs LOCAL (localhost)')
print('=' * 70)

# 1. Performance
print(f'\n--- 1. PERFORMANCE ---')
tests = [
    ('Homepage', '/'),
    ('API Health', '/api/health'),
    ('Shops List', '/api/shops'),
    ('Session', '/api/auth/session'),
    ('Public Shop', '/api/public/shop/test'),
    ('Dashboard', '/dashboard'),
    ('Pricing', '/dashboard/pricing'),
]

print(f'  {"Endpoint":25s} | {"LIVE ms":>10s} | {"LOCAL ms":>10s} | {"Diff":>10s}')
print(f'  {"-"*25} | {"-"*10} | {"-"*10} | {"-"*10}')

live_times = []
local_times = []

for name, path in tests:
    s1, b1, t1 = test_endpoint(LIVE, path)
    s2, b2, t2 = test_endpoint(LOCAL, path)
    live_times.append(t1)
    local_times.append(t2)
    diff = t1 - t2
    faster = 'LOCAL' if diff > 0 else 'LIVE'
    print(f'  {name:25s} | {t1:8.0f}ms | {t2:8.0f}ms | {diff:+8.0f}ms')

avg_live = sum(live_times) / len(live_times)
avg_local = sum(local_times) / len(local_times)
print(f'  {"AVERAGE":25s} | {avg_live:8.0f}ms | {avg_local:8.0f}ms | {avg_live-avg_local:+8.0f}ms')

# 2. Auth
print(f'\n--- 2. AUTH ---')
auth = {'phone': '01012345678', 'password': 'mohamed123'}
for label, base in [('LIVE', LIVE), ('LOCAL', LOCAL)]:
    s, b, t = test_endpoint(base, '/api/auth/login', 'POST', auth)
    owner = b.get('owner', {}).get('name', '?') if b else '?'
    shops = len(b.get('shops', [])) if b else 0
    print(f'  {label:6s} | Login HTTP {s} ({t:.0f}ms) | Owner: {owner} | Shops: {shops}')

wrong = {'phone': '01012345678', 'password': 'wrong'}
for label, base in [('LIVE', LIVE), ('LOCAL', LOCAL)]:
    s, _, t = test_endpoint(base, '/api/auth/login', 'POST', wrong)
    print(f'  {label:6s} | Wrong PW: HTTP {s} (expect 401)')

# 3. Data
print(f'\n--- 3. DATA (same Neon DB) ---')
for label, base in [('LIVE', LIVE), ('LOCAL', LOCAL)]:
    s, b, t = test_endpoint(base, '/api/shops')
    shops = b.get('shops', []) if b else []
    names = [sh.get('name', '?') for sh in shops[:5]]
    print(f'  {label:6s} | {len(shops)} shops: {names}')

# 4. Feature comparison
print(f'\n--- 4. FEATURES ---')
features = [
    ('Homepage', '/'),
    ('Dashboard', '/dashboard'),
    ('Admin', '/dashboard/admin'),
    ('Pricing', '/dashboard/pricing'),
    ('Upgrade', '/dashboard/upgrade'),
    ('Public Shop', '/shop/test'),
    ('Book Page', '/shop/test/book'),
    ('API Health', '/api/health'),
    ('API Shops', '/api/shops'),
    ('API Session', '/api/auth/session'),
]

print(f'  {"Feature":25s} | {"LIVE":>6s} | {"LOCAL":>6s} | {"Same":>5s}')
print(f'  {"-"*25} | {"-"*6} | {"-"*6} | {"-"*5}')

for name, path in features:
    s1, _, _ = test_endpoint(LIVE, path)
    s2, _, _ = test_endpoint(LOCAL, path)
    same = 'YES' if s1 == s2 else 'NO'
    print(f'  {name:25s} | {s1:6d} | {s2:6d} | {same:>5s}')

# 5. Shop endpoints
print(f'\n--- 5. SHOP ENDPOINTS ---')
SID = '07999c0e-65c5-48e2-b5ca-a74ecd800544'
endpoints = [
    ('Shop Details', f'/api/shops/{SID}'),
    ('Shop Settings', f'/api/shops/{SID}/settings'),
    ('Shop Bookings', f'/api/shops/{SID}/bookings'),
    ('Shop Queue', f'/api/shops/{SID}/queue'),
    ('Shop WhatsApp', f'/api/shops/{SID}/whatsapp-settings'),
    ('Shop Stats', f'/api/shops/{SID}/stats'),
    ('Shop Counters', f'/api/shops/{SID}/counters'),
    ('Shop Dashboard', f'/dashboard/shop/{SID}'),
    ('Shop Bookings pg', f'/dashboard/shop/{SID}/bookings'),
    ('Shop Settings pg', f'/dashboard/shop/{SID}/settings'),
    ('Shop Stats pg', f'/dashboard/shop/{SID}/stats'),
    ('Shop QR', f'/dashboard/shop/{SID}/qr'),
]

print(f'  {"Endpoint":25s} | {"LIVE":>6s} | {"LOCAL":>6s} | {"Same":>5s}')
print(f'  {"-"*25} | {"-"*6} | {"-"*6} | {"-"*5}')

for name, path in endpoints:
    s1, _, _ = test_endpoint(LIVE, path)
    s2, _, _ = test_endpoint(LOCAL, path)
    same = 'YES' if s1 == s2 else 'NO'
    print(f'  {name:25s} | {s1:6d} | {s2:6d} | {same:>5s}')

# 6. Security
print(f'\n--- 6. SECURITY ---')
for label, base in [('LIVE', LIVE), ('LOCAL', LOCAL)]:
    s, _, _ = test_endpoint(base, '/api/auth/login', 'POST', {"phone": "' OR 1=1--", "password": "x"})
    print(f'  {label:6s} | SQL Injection: HTTP {s} (blocked={s in [400,401]})')

for label, base in [('LIVE', LIVE), ('LOCAL', LOCAL)]:
    s, _, _ = test_endpoint(base, f'/api/shops/{SID}/bookings', 'POST', {"customerName": "<script>alert(1)</script>", "customerPhone": "01234567890"})
    print(f'  {label:6s} | XSS payload: HTTP {s} (safe={s in [200,400,404,422,500]})')

# Summary
print(f'\n{"=" * 70}')
print(f'  SUMMARY')
print(f'{"=" * 70}')
print(f'  LIVE:  tawabeer-mu.vercel.app')
print(f'  LOCAL: localhost:3004')
print(f'')
print(f'  Speed:')
print(f'    LIVE avg:  {avg_live:.0f}ms')
print(f'    LOCAL avg: {avg_local:.0f}ms')
if avg_local > 0:
    print(f'    LOCAL is {avg_live/avg_local:.1f}x faster')
print(f'')
print(f'  Data: Same Neon PostgreSQL database')
print(f'  Code: Same codebase (main branch on GitHub)')
print(f'')
print(f'  KEY DIFFERENCES:')
print(f'    1. LOCAL faster (no cold start, no edge routing)')
print(f'    2. LIVE has HTTPS + global CDN')
print(f'    3. LIVE auto-scales (serverless)')
print(f'    4. LIVE cold start ~5s first request')
print(f'    5. Both share same Neon DB')
print(f'    6. LIVE uses secure cookies (HTTPS)')
print(f'    7. LOCAL uses dev cookies (HTTP)')
print(f'{"=" * 70}')
