// Telegram notification helper
const BOT_TOKEN = process.env.BOT_TOKEN || "";

export interface TelegramResult {
  sent: boolean;
  error?: string;
}

export async function sendTelegramNotification(
  chatId: number | string,
  message: string
): Promise<TelegramResult> {
  if (!BOT_TOKEN) {
    return { sent: false, error: "No BOT_TOKEN configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { sent: false, error: `Telegram API error: ${res.status} ${errBody}` };
    }

    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e.message };
  }
}

export async function notifyCustomerCalled(
  chatId: number | string,
  shopName: string,
  entryNumber: number,
  recallCount: number = 0,
  customerPhone?: string,
  waLink?: string
): Promise<TelegramResult> {
  const isRecall = recallCount > 0;

  // بناء الرسالة الأساسية
  let message: string;

  if (isRecall) {
    message = `🔔🔔 <b>إعادة نداء!</b>\\n\\nرقم <b>${entryNumber}</b> — تفضل إلى <b>${shopName}</b> 🏪\\n\\n📌 تمت مناداتك ${recallCount + 1} مرات`;
  } else {
    message = `🔔 <b>حان طوابير!</b>\\n\\nرقم <b>${entryNumber}</b> — تفضل إلى <b>${shopName}</b> 🏪\\n\\n🎉 طوابير جه!`;
  }

  // إضافة رقم التليفون للربط لو موجود
  if (customerPhone) {
    message += `\\n\\n📱 <b>رقمك:</b> <code>${customerPhone}</code>`;
    message += `\\n\\n💡 <i>لو التليفون ده بتاعك، ابعته للبوت ده عشان تربط رقمك وتوصلك إشعارات تلقائيًا في كل مرة:</i>`;
    message += `\\n👉 @tawabeer_bot`;
  }

  // إضافة رابط واتساب لو موجود
  if (waLink) {
    message += `\\n\\n💬 <b>تواصل مع المحل عبر واتساب:</b>`;
    message += `\\n👉 <a href="${waLink}">فتح واتساب</a>`;
  }

  return sendTelegramNotification(chatId, message);
}
