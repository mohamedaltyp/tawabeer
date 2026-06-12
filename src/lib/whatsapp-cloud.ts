/**
 * WhatsApp Cloud API Integration
 * Uses Meta Cloud API for sending WhatsApp notifications.
 * 
 * Environment Variables (set on Vercel):
 * - WHATSAPP_PHONE_NUMBER_ID: Phone Number ID from Meta
 * - WHATSAPP_ACCESS_TOKEN: Permanent access token
 * - WHATSAPP_PHONE: The phone number that sends messages (+20XXXXXXXXX)
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "745675715292443";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "EAAnIAqk3abQBRsCoDzmUvFw2lboior3fmjnsake1szfxnLz4n4ssCjwfGSUZAKEuYedH2Q6A6wcrvOXt0zdTvzwBLiL1Do1B0ZCKxJ9x7xystmZAav59FTqG39k9oNfmY5BtdCMOa02bzDWPMMzpDhlxiWVhKRsEj0NUIQ79mbV3gtufpaq8T24FizzxVX6nAZDZD";
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || "+201017603874";

/**
 * Format Egyptian phone number for WhatsApp API
 * Input: "01017603874" or "+201017603874" or "201017603874"
 * Output: "201017603874" (without + or leading 0)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  
  // Remove leading 0 if Egyptian number
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "20" + cleaned.substring(1);
  }
  
  // Add country code if missing
  if (cleaned.length === 10 && cleaned.startsWith("1")) {
    cleaned = "20" + cleaned;
  }
  
  // Already has country code
  if (cleaned.startsWith("20") && cleaned.length === 12) {
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ sent: boolean; error?: string; messageId?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { sent: false, error: "WhatsApp not configured" };
  }

  try {
    const formattedPhone = formatPhoneForWhatsApp(to);
    
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return {
        sent: false,
        error: data?.error?.message || "Unknown WhatsApp error",
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return { sent: true, messageId };
  } catch (error: any) {
    console.error("WhatsApp send failed:", error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Send "Your turn is ready" notification via WhatsApp
 */
export async function notifyCustomerWhatsApp(
  phone: string,
  shopName: string,
  entryNumber: number,
  isRecall: boolean = false
): Promise<{ sent: boolean; error?: string }> {
  const message = isRecall
    ? `🔔 إعادة نداء!\n\n🏪 ${shopName}\n🔢 رقمك: ${entryNumber}\n⏰ تفضل الآن — تم تذكيرك!\n📌 إذا لم تحضر، سيتم تخطيك.`
    : `🔔 حان دورك!\n\n🏪 ${shopName}\n🔢 رقمك: ${entryNumber}\n⏰ تفضل الآن إلى ${shopName} — دورك جه!`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send booking confirmation via WhatsApp
 */
export async function notifyBookingWhatsApp(
  phone: string,
  shopName: string,
  bookingDate: string,
  timeSlot: string,
  entryNumber: number
): Promise<{ sent: boolean; error?: string }> {
  const message = `✅ تم تأكيد حجزك!\n\n🏪 ${shopName}\n📅 ${bookingDate}\n⏰ ${timeSlot}\n🔢 رقمك: ${entryNumber}\n\nنتظرك! 🎉`;

  return sendWhatsAppMessage(phone, message);
}
