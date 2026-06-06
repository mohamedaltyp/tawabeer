import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Simple admin auth
    if (body.admin_password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    
    if (body.action === "update-shop") {
      await sql`
        UPDATE shops SET 
          name = ${body.name},
          description = ${body.description || ""},
          address = ${body.address || ""},
          category = ${body.category || ""}
        WHERE id = ${body.shop_id}
      `;
      return NextResponse.json({ ok: true, message: "✅ تم تحديث المحل" });
    }
    
    if (body.action === "delete-shop") {
      await sql`DELETE FROM queue_entries WHERE shop_id = ${body.shop_id}`;
      await sql`DELETE FROM queue_settings WHERE shop_id = ${body.shop_id}`;
      await sql`DELETE FROM shops WHERE id = ${body.shop_id}`;
      return NextResponse.json({ ok: true, message: "✅ تم حذف المحل" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
