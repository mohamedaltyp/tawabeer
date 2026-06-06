import { NextRequest, NextResponse } from "next/server";
import { getAllShops, getShop, createShop } from "@/lib/db";

export async function GET() {
  const shops = getAllShops();
  return NextResponse.json({ shops });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shop = createShop(body);
    return NextResponse.json({ shop }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
