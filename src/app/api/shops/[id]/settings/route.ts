import { NextRequest, NextResponse } from "next/server";
import {
  getShop,
  getQueueSettings,
  updateQueueSettings,
  ensureMigrated,
} from "@/lib/db";
import { isOwnerPasswordValid } from "@/lib/auth";

// GET is public (customers need to see queue settings)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const settings = await getQueueSettings(id);
  return NextResponse.json({ 
    settings,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  });
}

// PUT requires shop owner password
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureMigrated();
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Verify owner password from header or body
  const headerPassword = req.headers.get("x-owner-password");
  let bodyPassword: string | undefined;
  let body: Record<string, unknown> = {};

  try {
    const parsed = await req.json();
    body = parsed;
    bodyPassword = parsed.owner_password;
  } catch {
    // No body or invalid JSON
  }

  const password = headerPassword || bodyPassword;
  if (!password || !(await isOwnerPasswordValid(password, shop.id, shop.owner_phone || ""))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Remove auth fields before passing to DB
  delete body.owner_password;

  const settings = await updateQueueSettings(id, body);
  return NextResponse.json({ settings });
}
