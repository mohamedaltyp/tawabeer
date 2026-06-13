import { NextRequest, NextResponse } from "next/server";
import { getAppSetting, setAppSetting } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 }); // 20 req/min

function verifyAdmin(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  const adminPassword = process.env.ADMIN_PASSWORD || "dawer-admin-2026";
  return token === adminPassword;
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

  return NextResponse.json({
    admin_whatsapp: await getAppSetting("admin_whatsapp"),
  });
}

export async function PUT(req: NextRequest) {
  const err = rateLimitOrUnauthorized(req);
  if (err) return err;

  const body = await req.json();
  if (body.admin_whatsapp !== undefined) {
    await setAppSetting("admin_whatsapp", body.admin_whatsapp);
  }
  return NextResponse.json({
    success: true,
    admin_whatsapp: await getAppSetting("admin_whatsapp"),
  });
}
