// Browser Push Notification helper (VAPID)
// Primary notification method — Telegram & WhatsApp are fallbacks

// Secrets come ONLY from the environment. Never hardcode VAPID keys.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@tawabeer.app";

/**
 * Convert VAPID public key to Uint8Array for Push API
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Send a push notification to a browser subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  url?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!VAPID_PRIVATE_KEY) {
    return { sent: false, error: "VAPID_PRIVATE_KEY not configured" };
  }

  try {
    // Use web-push library on server side
    const webPush = await import("web-push");
    
    webPush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    await webPush.sendNotification(subscription as any, payload);
    return { sent: true };
  } catch (e: any) {
    console.error("Push notification error:", e.message);
    return { sent: false, error: e.message };
  }
}

/**
 * Notify customer via browser push — "Your turn is ready!"
 */
export async function notifyCustomerPush(
  subscription: PushSubscription,
  shopName: string,
  entryNumber: number,
  recallCount: number = 0
): Promise<{ sent: boolean; error?: string }> {
  const isRecall = recallCount > 0;
  
  const title = isRecall ? "🔔 إعادة نداء!" : "🔔 حان طوابير!";
  const body = isRecall
    ? `رقم ${entryNumber} — تفضل إلى ${shopName} 🏪 (تمت مناداتك ${recallCount + 1} مرات)`
    : `رقم ${entryNumber} — تفضل إلى ${shopName} 🏪 (طوابير جه!)`;

  return sendPushNotification(subscription, title, body, "/");
}

/**
 * Notify customer via browser push — booking confirmation
 */
export async function notifyBookingPush(
  subscription: PushSubscription,
  shopName: string,
  bookingDate: string,
  timeSlot: string
): Promise<{ sent: boolean; error?: string }> {
  const title = "✅ تم تأكيد حجزك!";
  const body = `${shopName}\n📅 ${bookingDate}\n⏰ ${timeSlot}`;

  return sendPushNotification(subscription, title, body, "/");
}
