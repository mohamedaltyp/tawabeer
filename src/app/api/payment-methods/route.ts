import { NextResponse } from "next/server";
import { getActivePaymentMethods } from "@/lib/db";

export async function GET() {
  const methods = await getActivePaymentMethods();
  return NextResponse.json({ methods });
}
