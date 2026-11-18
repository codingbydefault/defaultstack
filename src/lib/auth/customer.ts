import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export function customerAuthConfigured(): boolean {
  return Boolean(process.env.DEFAULTSTACKR_AUTH_DATABASE_URL
    && process.env.DEFAULTSTACKR_AUTH_SECRET
    && process.env.DEFAULTSTACKR_AUTH_SECRET.length >= 32
    && process.env.DEFAULTSTACKR_PUBLIC_URL);
}

function createCustomerAuth() {
  const githubId = process.env.DEFAULTSTACKR_GITHUB_CLIENT_ID;
  const githubSecret = process.env.DEFAULTSTACKR_GITHUB_CLIENT_SECRET;
  const googleId = process.env.DEFAULTSTACKR_GOOGLE_CLIENT_ID;
  const googleSecret = process.env.DEFAULTSTACKR_GOOGLE_CLIENT_SECRET;
  return betterAuth({
    appName: 'DefaultStackr',
    baseURL: process.env.DEFAULTSTACKR_PUBLIC_URL,
    secret: process.env.DEFAULTSTACKR_AUTH_SECRET,
    database: new Pool({ connectionString: process.env.DEFAULTSTACKR_AUTH_DATABASE_URL, max: 5 }),
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 200 },
    socialProviders: {
      ...(githubId && githubSecret ? { github: { clientId: githubId, clientSecret: githubSecret } } : {}),
      ...(googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {}),
    },
    account: { accountLinking: { enabled: true, disableImplicitLinking: true } },
    rateLimit: { enabled: true, window: 60, max: 40, storage: 'database' },
    trustedOrigins: [
      ...(process.env.DEFAULTSTACKR_PUBLIC_URL?.startsWith('http://localhost:') ? [process.env.DEFAULTSTACKR_PUBLIC_URL] : []),
      'https://www.defaultstackr.cloud',
      'https://defaultstackr.nl', 'https://www.defaultstackr.nl',
      'https://defaultstackr.online', 'https://www.defaultstackr.online',
    ],
  });
}

let instance: ReturnType<typeof createCustomerAuth> | null = null;

export function customerAuth() {
  if (!customerAuthConfigured()) return null;
  if (!instance) instance = createCustomerAuth();
  return instance;
}

export async function customerSession(headers: Headers) {
  const auth = customerAuth();
  if (!auth) return null;
  try {
    return await auth.api.getSession({ headers });
  } catch {
    return null;
  }
}
