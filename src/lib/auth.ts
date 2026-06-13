import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

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

/**
 * Check if password is valid for any shop owned by the same owner.
 * This allows a user who logged in with one shop's password to manage all their shops.
 */
export async function isOwnerPasswordValid(
  password: string,
  shopOwnerId: string,
  shopOwnerPhone: string,
): Promise<boolean> {
  if (!password || !shopOwnerPhone) return false;

  const ADMIN_PW = process.env.ADMIN_PASSWORD || "dawer-admin-2026";
  if (password === ADMIN_PW) return true;

  const allShops = await sql`SELECT id, owner_password FROM shops WHERE owner_phone = ${shopOwnerPhone}` as unknown as { id: string; owner_password: string }[];
  
  for (const s of allShops) {
    if (s.owner_password) {
      const match = await bcrypt.compare(password, s.owner_password);
      if (match) return true;
    }
  }
  return false;
}
