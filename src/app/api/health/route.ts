import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let allOk = true;

  // 1. Server up check
  checks.server = "✅";
  const started = new Date().toISOString();

  // 2. Database check
  try {
    const dbPath = path.join(process.cwd(), "data.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    const row = db.prepare("SELECT COUNT(*) as count FROM shops").get() as { count: number };
    db.close();
    checks.database = `✅ (${row.count} shops)`;
  } catch (e: any) {
    checks.database = `❌ ${e.message}`;
    allOk = false;
  }

  // 3. Memory usage
  const mem = process.memoryUsage();
  checks.memory = `✅ ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`;

  // 4. Uptime
  checks.uptime = `✅ ${Math.floor(process.uptime() / 60)} min`;

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    timestamp: started,
    checks,
  });
}
