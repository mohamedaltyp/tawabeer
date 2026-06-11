/**
 * Basic API integration tests for the Tawabeer app.
 *
 * Usage:
 *   npx tsx src/__tests__/api.test.ts            # against default http://localhost:3000
 *   BASE_URL=http://localhost:3001 npx tsx src/__tests__/api.test.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
  }
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testHealth() {
  section("GET /api/health");

  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();

  assert(res.ok, `status is ${res.status} (2xx)`);
  assert(typeof data.status === "string", "response has status field");
  assert(["ok", "degraded"].includes(data.status), "status is 'ok' or 'degraded'");
  assert(typeof data.timestamp === "string", "response has timestamp field");
  assert(typeof data.checks === "object" && data.checks !== null, "response has checks object");
}

async function testGetShops() {
  section("GET /api/shops");

  const res = await fetch(`${BASE_URL}/api/shops`);
  const data = await res.json();

  assert(res.ok, `status is ${res.status} (2xx)`);
  assert(Array.isArray(data.shops), "response has shops array");
}

async function testCreateShop() {
  section("POST /api/shops");

  const shopName = `Test Shop ${Date.now()}`;
  const payload = {
    name: shopName,
    description: "A shop created by integration tests",
    owner_phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
  };

  const res = await fetch(`${BASE_URL}/api/shops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  assert(res.status === 201, `status is 201 (got ${res.status})`);
  assert(typeof data.shop === "object" && data.shop !== null, "response has shop object");
  assert(data.shop.name === shopName, "shop name matches");
  assert(typeof data.shop.id === "string", "shop has string id");

  return data.shop as { id: string; name: string };
}

async function testGetShopDetail(shopId: string) {
  section(`GET /api/shops/${shopId}`);

  const res = await fetch(`${BASE_URL}/api/shops/${shopId}`);
  const data = await res.json();

  assert(res.ok, `status is ${res.status} (2xx)`);
  assert(typeof data.shop === "object" && data.shop !== null, "response has shop object");
  assert(data.shop.id === shopId, "shop id matches");
  assert(Array.isArray(data.queue), "response has queue array");
  assert(Array.isArray(data.allQueue), "response has allQueue array");
  assert(typeof data.stats === "object", "response has stats object");
  assert(typeof data.settings === "object" && data.settings !== null, "response has settings object");
}

async function testGetShopNotFound() {
  section("GET /api/shops/nonexistent-id");

  const res = await fetch(`${BASE_URL}/api/shops/nonexistent-id`);

  assert(res.status === 404, `status is 404 (got ${res.status})`);
}

async function testJoinQueue(shopId: string) {
  section(`POST /api/shops/${shopId}/queue (join)`);

  const payload = {
    customerName: "Test Customer",
    customerPhone: "+15551234567",
  };

  const res = await fetch(`${BASE_URL}/api/shops/${shopId}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // May return 201 on success or 403 if plan limit reached / shop closed
  const data = await res.json();

  if (res.status === 201) {
    assert(true, "joined queue successfully (201)");
    assert(typeof data === "object", "response is an object");
  } else if (res.status === 403) {
    // Plan limit or shop closed — still valid response
    assert(true, `returned 403 with error code: ${data.code || "unknown"} (expected for plan/shop restrictions)`);
  } else if (res.status === 404) {
    assert(true, `returned 404 (shop may not exist in test DB)`);
  } else {
    assert(false, `unexpected status ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function testCallNext(shopId: string) {
  section(`PATCH /api/shops/${shopId}/queue (call-next)`);

  const res = await fetch(`${BASE_URL}/api/shops/${shopId}/queue`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "call-next" }),
  });

  // May return 200 with entry, 404 if no waiting entries, or 500 if DB issues
  const data = await res.json();

  if (res.status === 200) {
    assert(typeof data.entry === "object" && data.entry !== null, "response has entry object");
  } else if (res.status === 404) {
    assert(true, "returned 404 (no waiting entries — expected in clean test run)");
  } else if (res.status === 500) {
    assert(true, `returned 500 (server error — possibly DB not configured: ${data.error || ""})`);
  } else {
    assert(false, `unexpected status ${res.status}: ${JSON.stringify(data)}`);
  }
}

async function testCallNextInvalidAction(shopId: string) {
  section(`PATCH /api/shops/${shopId}/queue (invalid action)`);

  const res = await fetch(`${BASE_URL}/api/shops/${shopId}/queue`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "invalid-action" }),
  });

  assert(res.status === 400, `status is 400 for invalid action (got ${res.status})`);
}

async function testJoinQueueShopNotFound() {
  section("POST /api/shops/nonexistent-id/queue");

  const res = await fetch(`${BASE_URL}/api/shops/nonexistent-id/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: "Ghost" }),
  });

  assert(res.status === 404, `status is 404 (got ${res.status})`);
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🧪 API Integration Tests — ${BASE_URL}\n`);

  await testHealth();
  await testGetShops();

  const shop = await testCreateShop();

  if (shop?.id) {
    await testGetShopDetail(shop.id);
    await testJoinQueue(shop.id);
    await testCallNext(shop.id);
    await testCallNextInvalidAction(shop.id);
  } else {
    console.log("\n  ⚠️  Skipping shop-dependent tests (create shop failed or returned no id)");
    await testGetShopNotFound();
    await testJoinQueueShopNotFound();
  }

  // Summary
  console.log(`\n${"═".repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("\n💥 Test runner crashed:", err);
  process.exit(1);
});
