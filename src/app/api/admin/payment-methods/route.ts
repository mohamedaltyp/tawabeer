import { NextRequest, NextResponse } from "next/server";
import { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "@/lib/db";

const ADMIN_TOKEN = "dawer-admin-2026";

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${ADMIN_TOKEN}`) return true;
  try {
    const body = req.clone().json() as any;
    return body?.adminToken === ADMIN_TOKEN;
  } catch { return false; }
}

export async function GET() {
  const methods = await getPaymentMethods();
  return NextResponse.json({ methods });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const method = await addPaymentMethod(body);
  return NextResponse.json({ method }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, adminToken, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const method = await updatePaymentMethod(id, data);
  if (!method) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ method });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (body.adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deletePaymentMethod(body.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
