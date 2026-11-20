import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { Pool } from 'pg';
import { accountOptions, authBaseURL, githubAccountHooks, githubProviderConfig } from '@/lib/auth/github-signin.mjs';

export function customerAuthConfigured(): boolean {
  return Boolean(process.env.DEFAULTSTACKR_AUTH_DATABASE_URL
    && process.env.DEFAULTSTACKR_AUTH_SECRET
    && process.env.DEFAULTSTACKR_AUTH_SECRET.length >= 32);
}

function trustedOrigins(): string[] {
  const origin = authBaseURL();
  return [...new Set([
    origin,
    'https://defaultstack.vercel.app',
    'https://www.defaultstackr.cloud',
    'https://defaultstackr.nl', 'https://www.defaultstackr.nl',
    'https://defaultstackr.online', 'https://www.defaultstackr.online',
  ])];
}

function createCustomerAuth() {
  const github = githubProviderConfig() as NonNullable<BetterAuthOptions['socialProviders']>['github'];
  const googleId = process.env.DEFAULTSTACKR_GOOGLE_CLIENT_ID;
  const googleSecret = process.env.DEFAULTSTACKR_GOOGLE_CLIENT_SECRET;
  const hooks = githubAccountHooks();
  return betterAuth({
    appName: 'DefaultStackr',
    baseURL: authBaseURL(),
    secret: process.env.DEFAULTSTACKR_AUTH_SECRET,
    database: new Pool({ connectionString: process.env.DEFAULTSTACKR_AUTH_DATABASE_URL, max: 5, connectionTimeoutMillis: 3000 }),
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 200 },
    socialProviders: {
      ...(github ? { github } : {}),
      ...(googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {}),
    },
    account: accountOptions() as BetterAuthOptions['account'],
    ...(hooks ? { databaseHooks: hooks } : {}),
    rateLimit: { enabled: true, window: 60, max: 40, storage: 'database' },
    trustedOrigins: trustedOrigins(),
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
