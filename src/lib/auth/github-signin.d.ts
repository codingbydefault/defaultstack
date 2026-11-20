export function authCallbackOrigin(): string | null;
export function authBaseURL(): string;
export function githubSignInCredentials(): { clientId: string; clientSecret: string } | null;
export function githubSignInRedirectUri(): string | null;
export function githubSignInConfigured(): boolean;
export function githubSignInHref(): string;
export function verifiedPrimaryGithubEmail(emails: unknown): string | null;
export function githubDisplayName(profile: { name?: string; login?: string } | null, email: string): string;
export function githubUserInfo(token: { accessToken?: string } | null): Promise<{
  user: { name: string; email: string; image?: string; emailVerified: true };
  data: { id: string; login: string; email: string };
} | null>;
export function accountLinkingOptions(): {
  enabled: true;
  disableImplicitLinking: false;
  requireLocalEmailVerified: true;
};
export function accountOptions(): Record<string, unknown>;
export function clearedGithubTokenFields(account: { providerId?: string } | null): Record<string, null> | null;
export function githubAccountHooks(): {
  account: { create: { before: (account: { providerId?: string }) => Promise<{ data: unknown }> } };
} | undefined;
export function githubProviderConfig(): Record<string, unknown> | null;
export function customerSessionIssued(setCookie: string): boolean;
