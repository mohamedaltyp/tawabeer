     1|import { NextRequest, NextResponse } from "next/server";
     2|import { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "@/lib/db";
     3|
     4|const ADMIN_TOKEN = "dawer-admin-2026";
     5|
     6|function checkAdmin(req: NextRequest): boolean {
     7|  const auth = req.headers.get("authorization");
     8|  if (auth === `Bearer ${ADMIN_TOKEN}`) return true;
     9|  try {
    10|    const body = req.clone().json() as any;
    11|    return body?.adminToken === ADMIN_TOKEN;
    12|  } catch { return false; }
    13|}
    14|
    15|export async function GET() {
    16|  const methods = await getPaymentMethods();
    17|  return NextResponse.json({ methods });
    18|}
    19|
    20|export async function POST(req: NextRequest) {
    21|  const body = await req.json();
    22|  if (body.adminToken !== ADMIN_TOKEN) {
    23|    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    24|  }
    25|  const method = await addPaymentMethod(body);
    26|  return NextResponse.json({ method }, { status: 201 });
    27|}
    28|
    29|export async function PUT(req: NextRequest) {
    30|  const body = await req.json();
    31|  if (body.adminToken !== ADMIN_TOKEN) {
    32|    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    33|  }
    34|  const { id, adminToken, ...data } = body;
    35|  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    36|  const method = await updatePaymentMethod(id, data);
    37|  if (!method) return NextResponse.json({ error: "Not found" }, { status: 404 });
    38|  return NextResponse.json({ method });
    39|}
    40|
    41|export async function DELETE(req: NextRequest) {
    42|  const body = await req.json();
    43|  if (body.adminToken !== ADMIN_TOKEN) {
    44|    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    45|  }
    46|  const deleted = await deletePaymentMethod(body.id);
    47|  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    48|  return NextResponse.json({ success: true });
    49|}
    50|