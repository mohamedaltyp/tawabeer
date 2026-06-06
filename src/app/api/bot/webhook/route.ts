import { NextRequest, NextResponse } from "next/server";
import { linkTelegramToEntry, getQueueEntry, ensureMigrated } from "@/lib/db";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string; first_name?: string; username?: string };
    text?: string;
    entities?: { type: string; offset: number; length: number }[];
  };
}

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "BOT_TOKEN not configured" }, { status: 500 });
  }

  try {
    await ensureMigrated();
    const update: TelegramUpdate = await req.json();

    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text.trim();
    const firstName = update.message.chat.first_name || "عميلنا";

    // /start command
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const payload = parts[1] || "";

      if (payload.startsWith("notif_")) {
        const entryId = payload.replace("notif_", "").split("_")[0];
        const entry = await getQueueEntry(entryId);

        if (!entry) {
          const sent = await sendTelegramMessage(chatId, `مرحباً ${firstName} 🙋‍♂️\n\nعذراً، لم نعد نجد بيانات هذا الدخول. قد يكون قد اكتمل أو تم إلغاؤه.\n\nتفضل بزيارة الموقع لأخذ دور جديد: https://tawabeer-mu.vercel.app/`);
          return NextResponse.json({ ok: true, message: "not_found", sent });
        }

        const linked = await linkTelegramToEntry(entryId, chatId);
        if (linked) {
          const sent = await sendTelegramMessage(chatId,
            `✅ *تم الاشتراك في الإشعارات بنجاح!* 🎉\n\nمرحباً *${entry.customer_name || firstName}* 🙋‍♂️\n\n📋 رقم دورك: *${entry.number}*\n🏪 سيتم إعلامك عند قدوم دورك\n\n🔔 *سواء صفحة الموقع مفتوحة ولا لأ — هنبعتلك إشعار لحظة ما يجي دورك!*\n\nاسترخي واحنا نناديلك ✅`
          );
          return NextResponse.json({ ok: true, message: "linked", sent });
        } else {
          const sent = await sendTelegramMessage(chatId, `عذراً ${firstName}، حدث خطأ أثناء ربط الإشعارات. حاول مرة أخرى من الموقع. 🙏`);
          return NextResponse.json({ ok: true, message: "link_failed", sent });
        }
      } else {
        const sent = await sendTelegramMessage(chatId,
          `مرحباً بك في *دورك* 🙋‍♂️🎉

أنا بوت مساعد لنظام إدارة الطوابير.

📌 *ماذا يمكنني أن أفعل لك؟*
• 🔔 أشعرك لما يجي دورك في أي محل
• 📊 أتابع حالة الطابور

👆 امسح QR كود المحل، ودور على زر "إشعار تيليجرام" بعد ما تاخد رقمك!
        
https://tawabeer-mu.vercel.app/`
        );
        return NextResponse.json({ ok: true, message: "welcome", sent });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack?.substring(0, 500) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Tawabeer Bot Webhook is running",
    bot: "@tawabeer_bot",
    token_set: !!BOT_TOKEN,
    token_prefix: BOT_TOKEN.substring(0, 10),
  });
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Telegram API error: ${res.status} - ${errBody}`);
    }
    return res.ok;
  } catch (err: any) {
    console.error(`sendTelegramMessage catch: ${err.message}`);
    return false;
  }
}
