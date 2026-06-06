import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const results: any = {};

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

    // Check server encoding
    const encRows = await sql`SHOW SERVER_ENCODING` as any[];
    results.server_encoding = encRows[0]?.server_encoding || "unknown";

    // Check client encoding
    const clientEncRows = await sql`SHOW CLIENT_ENCODING` as any[];
    results.client_encoding = clientEncRows[0]?.client_encoding || "unknown";

    // Try to insert and read back Arabic text
    const testId = "enc-test-" + Date.now();
    await sql`DELETE FROM app_settings WHERE key LIKE 'enc-test-%'`;
    await sql`INSERT INTO app_settings (key, value) VALUES (${testId}, ${"مرحبا بالعالم"})`;
    
    // Read it back
    const readBack = await sql`SELECT value FROM app_settings WHERE key = ${testId}` as any[];
    results.stored_value = readBack[0]?.value || "not found";
    results.stored_value_hex = Buffer.from(readBack[0]?.value || "", "utf-8").toString("hex");
    results.expected_hex = Buffer.from("مرحبا بالعالم", "utf-8").toString("hex");
    results.match = results.stored_value === "مرحبا بالعالم";

    // Cleanup
    await sql`DELETE FROM app_settings WHERE key = ${testId}`;

    // Check shops - show hex of store names
    if (results.match === false) {
      const shops = await sql`SELECT id, name FROM shops ORDER BY created_at DESC LIMIT 5` as any[];
      results.shops = shops.map((s: any) => ({
        id: s.id,
        name: s.name,
        name_hex: Buffer.from(s.name || "", "utf-8").toString("hex"),
        name_bytes: [...Buffer.from(s.name || "", "utf-8")].join(","),
      }));
    }

  } catch (e: any) {
    results.error = e.message;
  }

  return NextResponse.json(results);
}
