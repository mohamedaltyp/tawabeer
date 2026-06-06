import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.admin_password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");
    const results: Record<string, any> = {};

    // Link phone to Telegram chat_id
    if (body.action === "link-phone") {
      const phone = body.phone.replace(/[^0-9]/g, "");
      const chatId = body.chat_id;

      // Add/update telegram_links
      await sql`
        INSERT INTO telegram_links (phone, chat_id) 
        VALUES (${phone}, ${String(chatId)})
        ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}
      `;
      results.link_added = true;

      // Update existing waiting entries with this phone
      const updateResult = await sql`
        UPDATE queue_entries 
        SET telegram_chat_id = ${String(chatId)}
        WHERE REPLACE(customer_phone, ' ', '') LIKE ${'%' + phone.slice(-10)}
          AND status = 'waiting'
          AND (telegram_chat_id IS NULL OR telegram_chat_id = '')
      ` as any;
      const updatedCount = (updateResult as any)?.count || 0;
      results.updated_entries = updatedCount;

      // Also update called entries (they might still get recall)
      const updateCalled = await sql`
        UPDATE queue_entries 
        SET telegram_chat_id = ${String(chatId)}
        WHERE REPLACE(customer_phone, ' ', '') LIKE ${'%' + phone.slice(-10)}
          AND status = 'called'
          AND (telegram_chat_id IS NULL OR telegram_chat_id = '')
      ` as any;
      const updatedCalledCount = (updateCalled as any)?.count || 0;
      results.updated_called_entries = updatedCalledCount;

      // Send test message
      if (BOT_TOKEN) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: parseInt(chatId),
              text: `✅ <b>تم ربط رقم ${phone}</b>\n\n🔔 هتوصللك إشعارات تيليجرام لما يجي دورك!\n${updatedCount > 0 ? `\n🔄 تم ربط ${updatedCount} دور في الانتظار` : ''}${updatedCalledCount > 0 ? ` و ${updatedCalledCount} دور تمت مناداتهم` : ''}`,
              parse_mode: "HTML",
            }),
          });
          const data = await res.json();
          results.test_message_sent = data.ok;
        } catch (e: any) {
          results.test_message_error = e.message;
        }
      }
    }

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
