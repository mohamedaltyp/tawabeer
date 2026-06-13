import { NextRequest, NextResponse } from "next/server";
import {
  getShop,
  getQueueSettings,
  updateQueueSettings,
  ensureMigrated,
} from "@/lib/db";
import { requireOwner } from "@/lib/auth";

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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // No body or invalid JSON
  }

  const auth = await requireOwner(req, shop, body.owner_password as string | undefined);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Remove auth fields before passing to DB
  delete body.owner_password;

  const settings = await updateQueueSettings(id, body);
  return NextResponse.json({ settings });
}
