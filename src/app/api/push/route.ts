import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

/**
 * POST /api/push — Save push subscription for a queue entry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryId, subscription } = body;

    if (!entryId || !subscription) {
      return NextResponse.json({ error: "Missing entryId or subscription" }, { status: 400 });
    }

    // Save subscription as JSON string
    const subJson = JSON.stringify(subscription);
    await sql`UPDATE queue_entries SET push_subscription = ${subJson} WHERE id = ${entryId}`;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Push subscription save error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
