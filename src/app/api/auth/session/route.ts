import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOwnerShopsByPhone, sanitizeShops } from "@/lib/db";

// Returns the currently logged-in owner (from the session cookie) and their shops.
// Lets the client hydrate without ever storing the password.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let shops: unknown[] = [];
  try {
    shops = await sanitizeShops(await getOwnerShopsByPhone(session.phone));
  } catch {
    shops = [];
  }

  return NextResponse.json({
    authenticated: true,
    owner: { phone: session.phone, name: session.name, isAdmin: !!session.isAdmin },
    shops,
  });
}
