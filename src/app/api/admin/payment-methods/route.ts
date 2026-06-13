import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/auth";

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 20 req/min

function verifyAdmin(req: NextRequest): boolean {
  return requireAdmin(req).ok;
}

function rateLimitOrUnauthorized(req: NextRequest): NextResponse | null {
  const { allowed, resetAt } = limiter.check(req);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const err = rateLimitOrUnauthorized(req);
  if (err) return err;

  const methods = await getPaymentMethods();
  return NextResponse.json({ methods });
}

export async function POST(req: NextRequest) {
  const err = rateLimitOrUnauthorized(req);
  if (err) return err;

  const body = await req.json();
  const method = await addPaymentMethod(body);
  return NextResponse.json({ method }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const err = rateLimitOrUnauthorized(req);
  if (err) return err;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const method = await updatePaymentMethod(id, data);
  if (!method)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ method });
}

export async function DELETE(req: NextRequest) {
  const err = rateLimitOrUnauthorized(req);
  if (err) return err;

  const body = await req.json();
  const deleted = await deletePaymentMethod(body.id);
  if (!deleted)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
