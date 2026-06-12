// WhatsApp Business Cloud API — per-shop credentials
// Each shop configures its own token + phone number via dashboard settings

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

export interface WhatsAppResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via Meta Cloud API
 * Uses per-shop credentials from queue_settings
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  shopToken?: string,
  shopPhoneNumberId?: string
): Promise<WhatsAppResult> {
  const token = shopToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = shopPhoneNumberId || WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      sent: false,
      error: "WhatsApp not configured — shop owner needs to set token + phone number in settings",
    };
  }

  // Normalize phone number
  let normalized = to.replace(/[\s\-+]/g, "").trim();
  // Ensure Egyptian number format (20XXXXXXXXXX)
  if (normalized.startsWith("010") || normalized.startsWith("011") || normalized.startsWith("012") || normalized.startsWith("015")) {
    normalized = "20" + normalized;
  }
  if (normalized.startsWith("00")) {
    normalized = normalized.substring(2);
  }

  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalized,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("WhatsApp API error:", data);
      return {
        sent: false,
        error: `WhatsApp API error: ${res.status} ${JSON.stringify(data)}`,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return { sent: true, messageId };
  } catch (e: any) {
    console.error("WhatsApp send error:", e.message);
    return { sent: false, error: e.message };
  }
}

/**
 * Notify customer their turn is ready (WhatsApp version)
 */
export async function notifyCustomerCalledWhatsApp(
  customerPhone: string,
  shopName: string,
  entryNumber: number,
  recallCount: number = 0,
  shopToken?: string,
  shopPhoneNumberId?: string
): Promise<WhatsAppResult> {
  if (!customerPhone || customerPhone.trim() === "") {
    return { sent: false, error: "No customer phone number" };
  }

  const isRecall = recallCount > 0;

  let message: string;

  if (isRecall) {
    message =
      `🔔🔔 إعادة نداء!\n\n` +
      `رقم ${entryNumber} — تفضل إلى ${shopName} 🏪\n\n` +
      `📌 تمت مناداتك ${recallCount + 1} مرات\n` +
      `⏳ يرجى التوجه سريعاً`;
  } else {
    message =
      `🔔 حان دورك!\n\n` +
      `رقم ${entryNumber} — تفضل إلى ${shopName} 🏪\n\n` +
      `🎉 دورك جه! يرجى التوجه الآن`;
  }

  return sendWhatsAppMessage(customerPhone, message, shopToken, shopPhoneNumberId);
}

/**
 * Notify customer with booking confirmation
 */
export async function notifyBookingConfirmedWhatsApp(
  customerPhone: string,
  shopName: string,
  bookingDate: string,
  timeSlot: string,
  queueNumber: number,
  shopToken?: string,
  shopPhoneNumberId?: string
): Promise<WhatsAppResult> {
  if (!customerPhone || customerPhone.trim() === "") {
    return { sent: false, error: "No customer phone number" };
  }

  const message =
    `✅ تم تأكيد حجزك!\n\n` +
    `🏪 ${shopName}\n` +
    `📅 التاريخ: ${bookingDate}\n` +
    `⏰ الوقت: ${timeSlot}\n` +
    `🔢 رقم الحجز: ${queueNumber}\n\n` +
    `💡 يرجى الحضور قبل الموعد بـ 10 دقائق`;

  return sendWhatsAppMessage(customerPhone, message, shopToken, shopPhoneNumberId);
}

/**
 * Send a custom WhatsApp message
 */
export async function sendCustomWhatsAppMessage(
  customerPhone: string,
  message: string,
  shopToken?: string,
  shopPhoneNumberId?: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage(customerPhone, message, shopToken, shopPhoneNumberId);
}

/**
 * Test WhatsApp connection for a specific shop
 */
export async function testWhatsAppConnection(
  shopToken?: string,
  shopPhoneNumberId?: string
): Promise<{
  connected: boolean;
  phoneNumberId?: string;
  error?: string;
}> {
  const token = shopToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = shopPhoneNumberId || WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      connected: false,
      error: "WhatsApp not configured — set token + phone number in shop settings",
    };
  }

  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return { connected: false, error: `API error: ${JSON.stringify(data)}` };
    }

    return {
      connected: true,
      phoneNumberId: data?.id,
    };
  } catch (e: any) {
    return { connected: false, error: e.message };
  }
}
