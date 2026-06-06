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
  recallCount: number = 0
): Promise<TelegramResult> {
  const isRecall = recallCount > 0;
  const message = isRecall
    ? `🔔🔔 <b>إعادة نداء!</b>\n\nرقم <b>${entryNumber}</b> — تفضل إلى <b>${shopName}</b> 🏪\n\n📌 تمت مناداتك ${recallCount + 1} مرات`
    : `🔔 <b>حان دورك!</b>\n\nرقم <b>${entryNumber}</b> — تفضل إلى <b>${shopName}</b> 🏪\n\n🎉 دورك جه!`;

  return sendTelegramNotification(chatId, message);
}
