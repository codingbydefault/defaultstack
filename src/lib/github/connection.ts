import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sessionSecret } from '@/lib/auth/session';

export const GITHUB_COOKIE = 'ds_github';
export const GITHUB_STATE_COOKIE = 'ds_github_state';

export type GitHubConnection = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  githubId: number;
  login: string;
};

export function githubConfig() {
  const clientId = process.env.DEFAULTSTACKR_GITHUB_CLIENT_ID;
  const clientSecret = process.env.DEFAULTSTACKR_GITHUB_CLIENT_SECRET;
  const appSlug = process.env.DEFAULTSTACKR_GITHUB_APP_SLUG;
  const publicUrl = process.env.DEFAULTSTACKR_PUBLIC_URL;
  if (!clientId || !clientSecret || !appSlug || !publicUrl || !sessionSecret()) return null;
  if (!/^[a-z0-9-]{1,100}$/.test(appSlug) || !/^[A-Za-z0-9_]+$/.test(clientId)) return null;
  let origin: URL;
  try { origin = new URL(publicUrl); } catch { return null; }
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost'))
    || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') return null;
  return { clientId, clientSecret, appSlug, origin: origin.origin };
}

function key(): Buffer | null {
  const secret = sessionSecret();
  return secret ? createHash('sha256').update('defaultstackr-github\0').update(secret).digest() : null;
}

export function sealConnection(connection: GitHubConnection): string {
  const secretKey = key();
  if (!secretKey) throw new Error('Session secret missing');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(connection)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]).toString('base64url');
}

export function openConnection(value: string | undefined): GitHubConnection | null {
  const secretKey = key();
  if (!value || !secretKey || value.length > 4000) return null;
  try {
    const encoded = Buffer.from(value, 'base64url');
    if (encoded.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', secretKey, encoded.subarray(0, 12));
    decipher.setAuthTag(encoded.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(encoded.subarray(28)), decipher.final()]).toString('utf8')) as GitHubConnection;
    return typeof data.accessToken === 'string' && Number.isSafeInteger(data.githubId) && typeof data.login === 'string' ? data : null;
  } catch { return null; }
}

export const githubCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export async function githubJson(path: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'DefaultStackr',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
  return response.json();
}

export async function refreshConnection(connection: GitHubConnection): Promise<GitHubConnection> {
  if (!connection.expiresAt || connection.expiresAt > Date.now() + 60000) return connection;
  const config = githubConfig();
  if (!config || !connection.refreshToken) throw new Error('GitHub connection expired');
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret,
      grant_type: 'refresh_token', refresh_token: connection.refreshToken }),
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  const token = await response.json() as Record<string, unknown>;
  if (!response.ok || typeof token.access_token !== 'string') throw new Error('GitHub connection expired');
  return { ...connection, accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : connection.refreshToken,
    expiresAt: typeof token.expires_in === 'number' ? Date.now() + token.expires_in * 1000 : undefined };
}
