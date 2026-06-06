import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

async function sendTelegram(chatId: number | string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Telegram send error:", e);
  }
}

// GET — Telegram verifies the webhook exists
export async function GET() {
  return NextResponse.json({ ok: true, bot: "tawabeer_bot" });
}

// POST — Incoming updates from Telegram (user messages to the bot)
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = (update.message.text || "").trim();

    // ── /start command — check for deep link ──
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const param = parts.length > 1 ? parts[1] : "";

      // 🔗 Deep link: /start link_<entryId> — auto-link queue entry
      if (param.startsWith("link_")) {
        const entryId = param.replace("link_", "");

        // Find the queue entry
        const entries = await sql`
          SELECT qe.*, s.name as shop_name, s.id as shop_id
          FROM queue_entries qe
          JOIN shops s ON s.id = qe.shop_id
          WHERE qe.id = ${entryId}
        ` as any[];

        if (entries.length === 0) {
          await sendTelegram(
            chatId,
            `❌ ما لقيت دور بهذا الرقم.\n\nممكن يكون الدور اتمسح أو الرقم غلط.\n\n📱 أرسل رقم موبايلك عشان تربطه وتستقبل الإشعارات.`
          );
          return NextResponse.json({ ok: true });
        }

        const entry = entries[0];
        const customerPhone = entry.customer_phone || "";
        const shopName = entry.shop_name || "المحل";
        const entryNumber = entry.number;

        // ✅ Link the chat_id to the queue entry
        await sql`
          UPDATE queue_entries 
          SET telegram_chat_id = ${String(chatId)}
          WHERE id = ${entryId}
        `;

        // ✅ Also add to telegram_links if phone exists
        let phoneLinked = false;
        if (customerPhone) {
          const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
          if (cleanPhone.length >= 10) {
            await sql`
              INSERT INTO telegram_links (phone, chat_id)
              VALUES (${cleanPhone}, ${String(chatId)})
              ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}
            `;
            phoneLinked = true;
          }
        }

        // Build success message
        let msg = `✅ <b>تم الربط بنجاح!</b>\n\n`;
        msg += `🏪 ${shopName}\n`;
        msg += `🔢 رقم دورك: <b>${entryNumber}</b>\n`;
        if (customerPhone) {
          msg += `📱 رقمك: <code>${customerPhone}</code>\n`;
        }
        msg += `\n`;

        if (entry.status === "waiting") {
          msg += `🟢 أنت الآن في قائمة الانتظار.\n`;
          msg += `🔔 هتوصلك رسالة تلقائية لما يحين دورك!\n`;
        } else if (entry.status === "called") {
          msg += `🔔🔔 <b>حان دورك الآن!</b>\n`;
          msg += `تفضل إلى ${shopName} 🏃‍♂️\n`;
        } else if (entry.status === "completed") {
          msg += `✅ تمت خدمتك بالفعل.\n`;
          msg += `شكراً لاستخدامك توابير! 🙏\n`;
        }

        if (phoneLinked) {
          msg += `\n📌 رقمك اتربط تلقائياً — هتوصلك إشعارات في كل مرة تحجز دور بنفس الرقم.`;
        }

        await sendTelegram(chatId, msg);
        return NextResponse.json({ ok: true });
      }

      // 🔗 Deep link: /start notif_<entryId>_<shopId> — old format (backward compat)
      if (param.startsWith("notif_")) {
        const notifParts = param.replace("notif_", "").split("_");
        const entryId = notifParts[0];

        const entries = await sql`
          SELECT qe.*, s.name as shop_name
          FROM queue_entries qe
          JOIN shops s ON s.id = qe.shop_id
          WHERE qe.id = ${entryId}
        ` as any[];

        if (entries.length > 0) {
          const entry = entries[0];
          if (entry.customer_phone) {
            const cleanPhone = entry.customer_phone.replace(/[^0-9]/g, "");
            await sql`
              INSERT INTO telegram_links (phone, chat_id)
              VALUES (${cleanPhone}, ${String(chatId)})
              ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}
            `;
            await sql`
              UPDATE queue_entries 
              SET telegram_chat_id = ${String(chatId)}
              WHERE id = ${entryId}
            `;
            await sendTelegram(
              chatId,
              `✅ <b>تم الربط بنجاح!</b>\n\n🏪 ${entry.shop_name}\n🔢 رقم دورك: <b>${entry.number}</b>\n📱 رقمك: <code>${entry.customer_phone}</code>\n\n🔔 هتوصلك إشعارات تلقائية لما يحين دورك!`
            );
          } else {
            await sendTelegram(
              chatId,
              `📱 أرسل رقم موبايلك عشان تربطه وتستقبل الإشعارات.\n\nمثال: 01001112233`
            );
          }
          return NextResponse.json({ ok: true });
        }
      }

      // ── Regular /start — show welcome ──
      await sendTelegram(
        chatId,
        `👋 مرحباً بك في بوت <b>دورك</b>!\n\n`
        + `📌 هذا البوت يرسل لك إشعار لما يجي دورك في أي محل يستخدم نظام توابير.\n\n`
        + `💡 <b>الاستخدام:</b>\n`
        + `1️⃣ أرسل رقم موبايلك عشان تربط حسابك (مثال: 01001112233)\n`
        + `2️⃣ احجز دورك بنفس رقم الموبايل\n`
        + `3️⃣ هتوصلك رسالة 🔔 لما يحين دورك!\n\n`
        + `🔍 <b>للاستعلام عن دور:</b>\n`
        + `أرسل رقم الدور لمتابعة وضعه.\n\n`
        + `📋 <b>الأوامر:</b>\n`
        + `/start — عرض هذه الرسالة\n`
        + `/phone 01001112233 — ربط رقم موبايلك\n`
        + `/unlink — إلغاء ربط رقمك`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /phone command — link phone number ──
    if (text.startsWith("/phone ")) {
      const phone = text.replace("/phone ", "").replace(/[^0-9+]/g, "").trim();
      if (phone.length < 10) {
        await sendTelegram(chatId, "❌ رقم الموبايل غير صحيح. أرسل رقم صحيح مكون من 11 رقم (مثال: 01001112233)");
        return NextResponse.json({ ok: true });
      }
      await sql`
        INSERT INTO telegram_links (phone, chat_id)
        VALUES (${phone}, ${String(chatId)})
        ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}
      `;
      await sendTelegram(
        chatId,
        `✅ <b>تم ربط رقمك بنجاح!</b>\n\n📱 ${phone}\n\n🔔 هتوصللك إشعارات على تيليجرام لما يجي دورك في أي محل — بس تأكد إنك تستخدم نفس الرقم عند حجز الدور.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── /unlink command ──
    if (text === "/unlink") {
      await sql`DELETE FROM telegram_links WHERE chat_id = ${String(chatId)}`;
      await sendTelegram(chatId, "✅ تم إلغاء ربط رقمك. لن تستقبل إشعارات.");
      return NextResponse.json({ ok: true });
    }

    // ── Phone number detection ──
    const isPhone = /^(\+20|0|0020)?1[0-9]{9}$/.test(text.replace(/[^0-9+]/g, ""));
    if (isPhone) {
      const cleanPhone = text.replace(/[^0-9]/g, "").trim();
      await sql`
        INSERT INTO telegram_links (phone, chat_id)
        VALUES (${cleanPhone}, ${String(chatId)})
        ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}
      `;

      // 🔄 Auto-update existing waiting queue entries with this phone
      const updated = await sql`
        UPDATE queue_entries
        SET telegram_chat_id = ${String(chatId)}
        WHERE customer_phone LIKE ${'%' + cleanPhone.slice(-10)}
          AND status = 'waiting'
          AND (telegram_chat_id IS NULL OR telegram_chat_id = '')
      ` as any;
      const updatedCount = updated?.count || 0;

      await sendTelegram(
        chatId,
        `✅ <b>تم ربط رقم ${cleanPhone}</b>\n\n🔔 هتوصللك إشعارات تيليجرام لما يجي دورك!\n${updatedCount > 0 ? `\n🔄 تم ربط ${updatedCount} دور في الانتظار — هتوصللك إشعاراتهم فوراً!` : ''}\n\n📌 استخدم /unlink لو عايز تلغي الربط.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── If user sends a number (not phone), search for their entry ──
    const isTicketNumber = /^\d+$/.test(text);
    if (isTicketNumber) {
      const entries = await sql`
        SELECT qe.*, s.name as shop_name
        FROM queue_entries qe
        JOIN shops s ON s.id = qe.shop_id
        WHERE qe.number = ${parseInt(text)}
          AND qe.customer_phone != ''
        ORDER BY qe.created_at DESC
        LIMIT 1
      `;

      if (entries.length > 0) {
        const entry: any = entries[0];
        const statusMap: Record<string, string> = {
          waiting: "🟢 في الانتظار",
          called: "🔔 تمت مناداتك — تفضل للمحل",
          completed: "✅ تمت الخدمة",
          cancelled: "❌ ملغي",
        };
        await sendTelegram(
          chatId,
          `🔍 <b>الرقم ${entry.number}</b>\n🏪 ${entry.shop_name}\nالحالة: ${statusMap[entry.status] || entry.status}`
        );
      } else {
        await sendTelegram(
          chatId,
          "❌ ما لقيت دور بهذا الرقم.\nتأكد من الرقم أو سجل دورك أولاً."
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Default: help message ──
    await sendTelegram(
      chatId,
      `👋 أهلاً! أنا بوت <b>دورك</b> 🤖\n\n`
        + `📱 أرسل رقم موبايلك عشان تربطه وتستقبل الإشعارات\n`
        + `🔢 أرسل رقم دورك عشان تعرف وضعه\n`
        + `📋 أو اكتب /start`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Bot webhook error:", e.message);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
