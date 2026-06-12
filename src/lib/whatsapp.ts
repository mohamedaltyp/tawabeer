// WhatsApp integration — wa.me links + Cloud API
// Each shop configures its own token + phone number via dashboard settings

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

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
  if (!shopToken || !shopPhoneNumberId) {
    return {
      sent: false,
      error: "WhatsApp not configured — shop owner needs to set token + phone number ID in settings",
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
    const url = `${WHATSAPP_API_URL}/${shopPhoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${shopToken}`,
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
 * Generate a wa.me link for a shop
 */
export function generateWaMeLink(phoneNumber: string, message?: string): string {
  let normalized = phoneNumber.replace(/[\s\-+]/g, "").trim();
  if (normalized.startsWith("010") || normalized.startsWith("011") || normalized.startsWith("012") || normalized.startsWith("015")) {
    normalized = "20" + normalized;
  }
  if (normalized.startsWith("00")) {
    normalized = normalized.substring(2);
  }
  const base = `https://wa.me/${normalized}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

/**
 * Generate a "join queue" WhatsApp message for a shop
 */
export function generateJoinQueueMessage(shopName: string, queueNumber: number): string {
  return `مرحباً، أنا مسجل في الطابور رقم ${queueNumber} في ${shopName}`;
}

/**
 * Generate a "my turn" WhatsApp message for a shop
 */
export function generateMyTurnMessage(shopName: string, entryNumber: number): string {
  return `مرحباً، أنا رقم ${entryNumber} في ${shopName} — حضرت ومستني`;
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
  if (!shopToken || !shopPhoneNumberId) {
    return {
      connected: false,
      error: "WhatsApp not configured — set token + phone number ID in shop settings",
    };
  }

  try {
    const url = `${WHATSAPP_API_URL}/${shopPhoneNumberId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${shopToken}` },
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
