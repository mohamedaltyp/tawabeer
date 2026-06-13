import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import type { NextRequest } from 'next/server';
import { getSession } from './session';

const SALT_ROUNDS = 12;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = neon(DATABASE_URL);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** The admin password from the environment. No insecure hardcoded fallback. */
export function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

/**
 * Check if password is valid for any shop owned by the same owner.
 */
export async function isOwnerPasswordValid(
  password: string,
  shopOwnerId: string,
  shopOwnerPhone: string,
): Promise<boolean> {
  if (!password || !shopOwnerPhone) return false;

  const adminPw = getAdminPassword();
  if (adminPw && password === adminPw) return true;

  const allShops = await sql`SELECT id, owner_password FROM shops WHERE owner_phone = ${shopOwnerPhone}` as unknown as { id: string; owner_password: string }[];

  for (const s of allShops) {
    if (s.owner_password) {
      const match = await bcrypt.compare(password, s.owner_password);
      if (match) return true;
    }
  }
  return false;
}

export type AuthResult =
  | { ok: true; phone: string; isAdmin: boolean }
  | { ok: false; status: number; error: string };

interface ShopLike {
  id: string;
  owner_phone?: string | null;
}

/**
 * Authorize the caller as the owner of `shop` (or an admin).
 * Primary: signed session cookie. Legacy fallback: owner password in the
 * `x-owner-password` header or request body. Never read from the query string.
 */
export async function requireOwner(
  req: NextRequest,
  shop: ShopLike,
  legacyBodyPassword?: string,
): Promise<AuthResult> {
  const session = getSession(req);
  if (session) {
    if (session.isAdmin) return { ok: true, phone: session.phone, isAdmin: true };
    if (shop.owner_phone && session.phone === shop.owner_phone) {
      return { ok: true, phone: session.phone, isAdmin: false };
    }
    return { ok: false, status: 403, error: "غير مصرح لك بإدارة هذا المحل" };
  }

  const password = req.headers.get("x-owner-password") || legacyBodyPassword;
  if (password && (await isOwnerPasswordValid(password, shop.id, shop.owner_phone || ""))) {
    return { ok: true, phone: shop.owner_phone || "", isAdmin: false };
  }

  return { ok: false, status: 401, error: "يجب تسجيل الدخول" };
}

/** Authorize an admin caller via session or the admin password (header/body). */
export function requireAdmin(req: NextRequest, legacyToken?: string): AuthResult {
  const session = getSession(req);
  if (session?.isAdmin) return { ok: true, phone: session.phone, isAdmin: true };

  const adminPw = getAdminPassword();
  if (!adminPw) {
    return { ok: false, status: 503, error: "خدمة الإدارة غير مهيأة (ADMIN_PASSWORD غير مضبوط)" };
  }
  const token = req.headers.get("x-admin-password") || legacyToken;
  if (token && token === adminPw) return { ok: true, phone: "admin", isAdmin: true };

  return { ok: false, status: 401, error: "غير مصرح" };
}
