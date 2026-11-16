// Session cookies are HMAC-signed with Web Crypto so middleware (Edge) and
// route handlers can both verify them. The API key never enters this module.

export const SESSION_COOKIE = 'ds_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { sub: 'admin'; exp: number };

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64Url(signature);
}

function signaturesMatch(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

export function sessionSecret(): string | undefined {
  const secret = process.env.DEFAULTSTACKR_SESSION_SECRET;
  if (!secret || secret.length < 16) return undefined;
  return secret;
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload: SessionPayload = { sub: 'admin', exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(secret, body)}`;
}

export async function readSession(token: string | undefined, secret = sessionSecret()): Promise<boolean> {
  if (!token || !secret) return false;
  const separator = token.indexOf('.');
  if (separator <= 0) return false;
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = await sign(secret, body);
  if (!signaturesMatch(expected, signature)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as Partial<SessionPayload>;
    return payload.sub === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/app') || value.startsWith('//') || value.startsWith('/app/login')) return '/app';
  if (value.includes('\\') || value.includes('\n') || value.includes('\r')) return '/app';
  return value;
}

// Middleware tells the app layout which relative login URL to send.
// A Location set inside middleware is rewritten to the bind host
// (https://localhost:3100) behind Nginx.
export const LOGIN_TARGET_HEADER = 'x-defaultstackr-login';

export function loginRedirectPath(pathname: string): string {
  const next = pathname !== '/app';
  return '/app/login' + (next ? '?next=' + encodeURIComponent(pathname) : '');
}

export function safeLoginLocation(value: string | null | undefined): string {
  if (value === '/app/login') return value;
  const prefix = '/app/login?next=';
  if (!value || !value.startsWith(prefix)) return '/app/login';
  let pathname: string;
  try {
    pathname = decodeURIComponent(value.slice(prefix.length));
  } catch {
    return '/app/login';
  }
  if (loginRedirectPath(pathname) !== value || safeNextPath(pathname) !== pathname) return '/app/login';
  return value;
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_SECONDS,
};
