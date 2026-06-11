import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, updateQueueSettings, sanitizeShop } from "@/lib/db";
=======
import { getShop, updateShop, getActiveQueue, getQueueEntries, getQueueStats, getQueueSettings, sanitizeShop, sanitizeText, ensureMigrated } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
>>>>>>> 950f47a91a6abddc2e5ad58f7ab5dc80aafb1e92

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
<<<<<<< HEAD
  const shopRaw = getShop(id);
=======
  const shopRaw = await getShop(id);
>>>>>>> 950f47a91a6abddc2e5ad58f7ab5dc80aafb1e92
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);

  const settings = await getQueueSettings(id);
  const stats = await getQueueStats(id);
  const queue = await getActiveQueue(id);
  const allQueue = await getQueueEntries(id);

  return NextResponse.json({ shop, settings, stats, queue, allQueue });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const { id } = await params;
  const body = await req.json();
<<<<<<< HEAD
  const shopRaw = updateShop(id, body);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  const shop = sanitizeShop(shopRaw);
=======
  
  // Auth: require owner_password or admin password
  if (!body.owner_password) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  
  const shopRaw = await getShop(id);
  if (!shopRaw) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  
  const isAdmin = body.owner_password === (process.env.ADMIN_PASSWORD || "dawer-admin-2026");
  if (!isAdmin && shopRaw.owner_password && !(await comparePassword(body.owner_password, shopRaw.owner_password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }
  
  // Remove owner_password from update data
  const { owner_password, ...updateData } = body;
  
  // Sanitize text fields
  if (updateData.name) updateData.name = sanitizeText(updateData.name);
  if (updateData.description) updateData.description = sanitizeText(updateData.description);
  
  const updated = await updateShop(id, updateData);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  const shop = sanitizeShop(updated);
>>>>>>> 950f47a91a6abddc2e5ad58f7ab5dc80aafb1e92
  return NextResponse.json({ shop });
}
