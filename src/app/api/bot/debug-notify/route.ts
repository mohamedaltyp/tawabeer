import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

    // 1️⃣ Check telegram_links table
    const links = await sql`SELECT * FROM telegram_links ORDER BY created_at DESC` as any[];
    results.telegram_links = links.map((l: any) => ({
      phone: l.phone,
      chat_id: l.chat_id,
      created_at: l.created_at,
    }));

    // 2️⃣ Check if telegram_chat_id column exists on queue_entries
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'queue_entries' AND column_name = 'telegram_chat_id'
    ` as any[];
    results.telegram_chat_id_column = columns.length > 0 ? "✅ exists" : "❌ MISSING";

    // 3️⃣ Check recent queue entries and see if telegram_chat_id is populated
    const recentEntries = await sql`
      SELECT id, number, customer_name, customer_phone, telegram_chat_id, status, created_at
      FROM queue_entries 
      ORDER BY created_at DESC LIMIT 10
    ` as any[];
    results.recent_entries = recentEntries.map((e: any) => ({
      number: e.number,
      customer_name: e.customer_name,
      customer_phone: e.customer_phone,
      telegram_chat_id: e.telegram_chat_id || "(empty)",
      status: e.status,
      has_telegram: e.telegram_chat_id && e.telegram_chat_id.length > 0,
    }));

    // 4️⃣ Test: for each linked phone, try to find queue entries with that phone
    if (links.length > 0) {
      const testPhone = links[0].phone;
      const matchingEntries = await sql`
        SELECT id, number, customer_name, customer_phone, telegram_chat_id, status
        FROM queue_entries 
        WHERE REPLACE(customer_phone, ' ', '') LIKE ${'%' + testPhone.slice(-10) + '%'}
        ORDER BY created_at DESC LIMIT 5
      ` as any[];
      results.matching_entries_for_linked_phone = matchingEntries;
    }

    // 5️⃣ Check shops for callNext test
    const shops = await sql`SELECT id, name, current_number FROM shops` as any[];
    results.shops = shops;

  } catch (e: any) {
    results.error = e.message;
  }

  return NextResponse.json(results);
}
