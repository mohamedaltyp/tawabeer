import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const sql = neon(DATABASE_URL);

  const results: string[] = [];

  try {
    // Add booking_enabled column
    await sql`ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS booking_enabled INTEGER DEFAULT 0`;
    results.push("✅ booking_enabled added");
  } catch (e: any) {
    results.push(`❌ booking_enabled: ${e.message}`);
  }

  try {
    await sql`ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30`;
    results.push("✅ slot_duration_minutes added");
  } catch (e: any) {
    results.push(`❌ slot_duration_minutes: ${e.message}`);
  }

  try {
    await sql`ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 5`;
    results.push("✅ max_bookings_per_slot added");
  } catch (e: any) {
    results.push(`❌ max_bookings_per_slot: ${e.message}`);
  }

  try {
    await sql`ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS booking_advance_days INTEGER DEFAULT 7`;
    results.push("✅ booking_advance_days added");
  } catch (e: any) {
    results.push(`❌ booking_advance_days: ${e.message}`);
  }

  // Verify
  const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'queue_settings' AND column_name IN ('booking_enabled', 'slot_duration_minutes', 'max_bookings_per_slot', 'booking_advance_days')` as any[];
  results.push(`\n📊 Columns found: ${check.length}/4`);

  // Update existing settings to enable booking
  try {
    await sql`UPDATE queue_settings SET booking_enabled = 1 WHERE booking_enabled = 0`;
    results.push("✅ Enabled booking for all shops");
  } catch (e: any) {
    results.push(`❌ Enable: ${e.message}`);
  }

  return NextResponse.json({ results });
}
