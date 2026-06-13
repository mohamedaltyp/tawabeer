import { NextResponse } from "next/server";

/**
 * GET /api/push/vapid — Return VAPID public key for push subscriptions
 */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return NextResponse.json({ publicKey: key });
}
