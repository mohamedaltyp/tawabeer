// WhatsApp integration — wa.me links (no API token needed)
// Each shop just needs to set their WhatsApp number

/**
 * Generate a wa.me link for a shop
 * @param phoneNumber - The shop's WhatsApp number (e.g., "01012345678" or "+201012345678")
 * @param message - Optional pre-filled message
 * @returns wa.me URL
 */
export function generateWaMeLink(phoneNumber: string, message?: string): string {
  // Normalize: remove spaces, dashes, + prefix
  let normalized = phoneNumber.replace(/[\s\-+]/g, "").trim();

  // Ensure Egyptian format (20XXXXXXXXXX)
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
