import { NextResponse } from "next/server";

/**
 * GET /api/push/vapid — Return VAPID public key for push subscriptions
 */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BE8-aGxHZ-WIVJM4Er_1tibtao13441BpH07UEoR2rT2pnT21tDI7c7OF6GquKspOq-2LkFge65WBqWPs8Yb9LI";
  return NextResponse.json({ publicKey: key });
}
