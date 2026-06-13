import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────
// Stateless signed sessions (HMAC-SHA256). No external deps.
// Used to authenticate shop owners and admins via an httpOnly cookie
// instead of sending the password on every request.
// ─────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "tawabeer_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export interface SessionPayload {
  phone: string;
  name: string;
  isAdmin?: boolean;
  iat: number; // issued-at (seconds)
  exp: number; // expiry (seconds)
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Fallback for both dev and production (Vercel may not have env vars set)
  console.warn(
    "[session] SESSION_SECRET not set — using a built-in fallback secret.",
  );
  return "tawabeer-fallback-secret-2026-please-set-session-secret";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function createSessionToken(
  data: { phone: string; name: string; isAdmin?: boolean },
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    phone: data.phone,
    name: data.name,
    isAdmin: data.isAdmin || false,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
  };
  const body = base64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest();
  return `${body}.${base64url(sig)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest();
  const provided = fromBase64url(sig);
  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64url(body).toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Attach a fresh session cookie to a response. */
export function setSessionCookie(
  res: NextResponse,
  data: { phone: string; name: string; isAdmin?: boolean },
): NextResponse {
  res.cookies.set(SESSION_COOKIE, createSessionToken(data), cookieOptions());
  return res;
}

/** Clear the session cookie. */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return res;
}
