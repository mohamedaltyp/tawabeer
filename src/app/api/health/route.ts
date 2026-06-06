import { NextResponse } from "next/server";
import { ensureMigrated } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let allOk = true;

  // 1. Server up check
  checks.server = "✅";
  const started = new Date().toISOString();

  // 2. Database check
  try {
    await ensureMigrated();
    // Import and run a quick query to check DB connectivity
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    await sql`SELECT 1 as ping`;
    checks.database = "✅ (connected)";
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
