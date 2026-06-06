     1|import { NextResponse } from "next/server";
     2|import { getActivePaymentMethods } from "@/lib/db";
     3|
     4|export async function GET() {
     5|  const methods = await getActivePaymentMethods();
     6|  return NextResponse.json({ methods });
     7|}
     8|