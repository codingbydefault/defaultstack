import { scrypt, timingSafeEqual } from 'node:crypto';

// Format written by scripts/hash-admin-password.mjs:
// scrypt$16384$8$1$<salt-base64url>$<hash-base64url>
const HASH_PATTERN = /^scrypt\$16384\$8\$1\$([A-Za-z0-9_-]{16,})\$([A-Za-z0-9_-]{16,})$/;

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N: 16384, r: 8, p: 1 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export function passwordHashConfigured(): boolean {
  const hash = process.env.DEFAULTSTACKR_ADMIN_PASSWORD_HASH;
  return typeof hash === 'string' && HASH_PATTERN.test(hash);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (password.length < 10 || password.length > 200) return false;
  const encoded = process.env.DEFAULTSTACKR_ADMIN_PASSWORD_HASH ?? '';
  const match = HASH_PATTERN.exec(encoded);
  if (!match) return false;
  const salt = Buffer.from(match[1], 'base64url');
  const expected = Buffer.from(match[2], 'base64url');
  if (salt.length < 16 || expected.length !== 32) return false;
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
