// ─── WhatsApp Notification Service ───
// يستخدم WhatsApp Cloud API (Meta)
// يحتاج: Meta Business Account + WhatsApp Business Account + Access Token

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessPhone: string; // رقم المحل على واتساب بزنس
}

let cachedConfig: WhatsAppConfig | null = null;

export function setWhatsAppConfig(config: WhatsAppConfig) {
  cachedConfig = config;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (cachedConfig) return cachedConfig;
  // قراءة من البيئة
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessPhone = process.env.WHATSAPP_BUSINESS_PHONE;
  if (phoneNumberId && accessToken && businessPhone) {
    cachedConfig = { phoneNumberId, accessToken, businessPhone };
    return cachedConfig;
  }
  return null;
}

// إرسال رسالة واتساب للعميل
export async function sendWhatsAppNotification(params: {
  to: string; // رقم العميل مع مفتاح الدولة (مثال: 20100xxxxxxx)
  shopName: string;
  customerNumber: number;
  shopUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: params.to,
          type: "template",
          template: {
            name: "turn_notification", // قالب هتعمله في Meta Business
            language: { code: "ar" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: params.shopName },
                  { type: "text", text: String(params.customerNumber) },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: 0,
                parameters: [
                  { type: "text", text: params.shopUrl || "" },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// إنشاء رابط واتساب مباشر (للنسخة المجانية — بديل مؤقت)
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  // لو الرقم مصري ومش مسبوق بـ 2، نضيف 2
  const fullPhone = cleaned.startsWith("2") ? cleaned : `2${cleaned}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
