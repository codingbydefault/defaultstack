// GitHub sign-in for customer accounts. better-auth performs the authorization-code
// exchange, PKCE, and the state check. This module only supplies the registered
// redirect URL, the verified-email rule, and the decision not to keep the access token.

const FALLBACK_ORIGIN = 'https://www.defaultstackr.cloud';

export function authCallbackOrigin() {
  const raw = (process.env.GITHUB_OAUTH_REDIRECT_BASE || process.env.DEFAULTSTACKR_PUBLIC_URL || FALLBACK_ORIGIN).trim();
  let url;
  try { url = new URL(raw); } catch { return null; }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  if (url.protocol === 'https:') return url.origin;
  if (url.protocol === 'http:' && local) return url.origin;
  return null;
}

export function authBaseURL() {
  return authCallbackOrigin() || FALLBACK_ORIGIN;
}

export function githubSignInCredentials() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? '';
  if (!clientId || !clientSecret) return null;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(clientId)) return null;
  if (clientSecret.length < 8 || clientSecret.length > 200) return null;
  return { clientId, clientSecret };
}

export function githubSignInRedirectUri() {
  const origin = authCallbackOrigin();
  if (!origin || !githubSignInCredentials()) return null;
  return `${origin}/api/auth/github/callback`;
}

export function githubSignInConfigured() {
  return Boolean(githubSignInRedirectUri());
}

export function githubSignInHref() {
  const origin = authCallbackOrigin();
  return origin && githubSignInCredentials() ? `${origin}/api/auth/github` : '/api/auth/github';
}

export function verifiedPrimaryGithubEmail(emails) {
  if (!Array.isArray(emails)) return null;
  const primary = emails.find((item) => item && typeof item === 'object' && item.primary === true);
  if (!primary || primary.verified !== true || typeof primary.email !== 'string') return null;
  const email = primary.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function githubDisplayName(profile, email) {
  const named = typeof profile?.name === 'string' ? profile.name.trim() : '';
  const login = typeof profile?.login === 'string' ? profile.login.trim() : '';
  const raw = named || login || email.split('@')[0];
  const name = raw.replace(/[\u0000-\u001f]/g, '').slice(0, 40);
  return name || 'GitHub';
}

function githubAccountId(profile) {
  const value = profile && (typeof profile.id === 'number' || typeof profile.id === 'string') ? String(profile.id) : '';
  return /^[1-9]\d{0,19}$/.test(value) ? value : null;
}

export async function githubUserInfo(token) {
  const accessToken = token && typeof token.accessToken === 'string' ? token.accessToken : '';
  if (!accessToken) return null;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'DefaultStackr',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  try {
    const userResponse = await fetch('https://api.github.com/user', {
      headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!userResponse.ok) return null;
    const profile = await userResponse.json();
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!emailResponse.ok) return null;
    const email = verifiedPrimaryGithubEmail(await emailResponse.json());
    const id = githubAccountId(profile);
    if (!email || !id) return null;
    return {
      user: {
        name: githubDisplayName(profile, email),
        email,
        image: typeof profile.avatar_url === 'string' ? profile.avatar_url : undefined,
        emailVerified: true,
      },
      // account id comes from data.id. GitHub's site_admin flag is not a DefaultStackr role.
      data: { id, login: typeof profile.login === 'string' ? profile.login : '', email },
    };
  } catch {
    return null;
  }
}

export function accountLinkingOptions() {
  return {
    enabled: true,
    // Email matching links only when the provider email is verified and the
    // existing account email is verified. The GitHub user id on account.accountId
    // is checked first and signs in that user without using the email rule.
    disableImplicitLinking: false,
    requireLocalEmailVerified: true,
  };
}

export function accountOptions() {
  return {
    accountLinking: accountLinkingOptions(),
    // Random state and the PKCE verifier live in one encrypted cookie for 10 minutes.
    storeStateStrategy: 'cookie',
    // Legacy GitHub App tokens are still read for repository access. Encrypt those.
    // The sign-in app token is removed before insert; see githubAccountHooks.
    encryptOAuthTokens: true,
    ...(githubSignInCredentials() ? { updateAccountOnSignIn: false } : {}),
  };
}

export function clearedGithubTokenFields(account) {
  if (!account || account.providerId !== 'github' || !githubSignInCredentials()) return null;
  return {
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  };
}

export function githubAccountHooks() {
  if (!githubSignInCredentials()) return undefined;
  return {
    account: {
      create: {
        before: async (account) => {
          const cleared = clearedGithubTokenFields(account);
          return { data: cleared ?? account };
        },
      },
    },
  };
}

export function githubProviderConfig() {
  const signIn = githubSignInCredentials();
  const redirectURI = githubSignInRedirectUri();
  if (signIn && redirectURI) {
    return {
      clientId: signIn.clientId,
      clientSecret: signIn.clientSecret,
      redirectURI,
      disableIdTokenSignIn: true,
      requireEmailVerification: true,
      getUserInfo: githubUserInfo,
    };
  }
  const clientId = process.env.DEFAULTSTACKR_GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.DEFAULTSTACKR_GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function customerSessionIssued(setCookie) {
  return /session_token=[^;]/.test(setCookie) && !/session_token=;/.test(setCookie) && !/Max-Age=0/i.test(setCookie);
}
