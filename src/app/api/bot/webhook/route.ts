import { NextRequest, NextResponse } from "next/server";
import { linkTelegramToEntry, getQueueEntry, ensureMigrated } from "@/lib/db";

const BOT_TOKEN = process.env.BOT_TOKEN || "";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string; first_name?: string; username?: string };
    text?: string;
    entities?: { type: string; offset: number; length: number }[];
  };
  callback_query?: any;
}

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "BOT_TOKEN not configured" }, { status: 500 });
  }

  try {
    // Ensure database schema is up to date
    await ensureMigrated();
    const update: TelegramUpdate = await req.json();

    // Only process messages with text
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text.trim();
    const firstName = update.message.chat.first_name || "عميلنا";

    // /start command - with or without payload
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const payload = parts[1] || "";
      const botUsername = "@tawabeer_bot";

      if (payload.startsWith("notif_")) {
        // Linking: /start notif_entryId (payload format from QR page)
        const entryId = payload.replace("notif_", "").split("_")[0];
        const entry = await getQueueEntry(entryId);

        if (!entry) {
          await sendTelegramMessage(
            chatId,
            `مرحباً ${firstName} 🙋‍♂️\n\nعذراً، لم نعد نجد بيانات هذا الدخول. قد يكون قد اكتمل أو تم إلغاؤه.\n\nتفضل بزيارة الموقع لأخذ دور جديد: https://tawabeer-mu.vercel.app/`
          );
          return NextResponse.json({ ok: true });
        }

        // Link the Telegram chat to this entry
        const linked = await linkTelegramToEntry(entryId, chatId);
        if (linked) {
          await sendTelegramMessage(
            chatId,
            `✅ *تم الاشتراك في الإشعارات بنجاح!* 🎉

مرحباً *${entry.customer_name || firstName}* 🙋‍♂️

📋 رقم دورك: *${entry.number}*
🏪 المحل: سيتم إعلامك عند قدوم دورك

🔔 *سواء صفحة الموقع مفتوحة ولا لأ — هنبعتلك إشعار لحظة ما يجي دورك!*

استرخي وأنت في مكانك، واحنا نناديلك لما يجي دورك ✅`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `عذراً ${firstName}، حدث خطأ أثناء ربط الإشعارات. حاول مرة أخرى من الموقع. 🙏`
          );
        }
      } else {
        // Plain /start - show welcome
        await sendTelegramMessage(
          chatId,
          `مرحباً بك في *دورك* 🙋‍♂️🎉

أنا بوت مساعد لنظام إدارة الطوابير \`دورك\`.

📌 *ماذا يمكنني أن أفعل لك؟*
• 🔔 أشعرك لما يجي دورك في أي محل
• 📊 أتابع حالة الطابور لحظة بلحظة

👆 *لبدء الاستخدام:* امسح QR كود المحل اللي عايز تروح له، ودور على زر "إشعار تيليجرام" بعد ما تاخد رقمك!

أو زور الموقع مباشرة:
https://tawabeer-mu.vercel.app/`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Bot webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// GET handler for webhook verification
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Tawabeer Bot Webhook is running",
    bot: "@tawabeer_bot",
  });
}

// ─── Helper: Send Telegram Message ──────────

async function sendTelegramMessage(chatId: string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
