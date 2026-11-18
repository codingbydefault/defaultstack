import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/auth/session';
import { GITHUB_COOKIE, githubConfig, githubCookieOptions, githubJson, openConnection, refreshConnection, sealConnection } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

type Installation = { id: number; account?: { login?: string } };
type GitHubRepository = {
  id: number; full_name: string; html_url: string; clone_url: string;
  default_branch: string; private: boolean;
};

export async function GET() {
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  if (!githubConfig()) return NextResponse.json({ error: 'GitHub is nog niet ingesteld.' }, { status: 503 });
  const current = openConnection(jar.get(GITHUB_COOKIE)?.value);
  if (!current) return NextResponse.json({ error: 'Koppel eerst je GitHub-account.' }, { status: 401 });
  try {
    const connection = await refreshConnection(current);
    const data = await githubJson('/user/installations?per_page=100', connection.accessToken) as { installations?: Installation[]; total_count?: number };
    const installations = Array.isArray(data.installations) ? data.installations.filter(item => Number.isSafeInteger(item.id)) : [];
    const groups = await Promise.all(installations.slice(0, 20).map(async installation => {
      const value = await githubJson(`/user/installations/${installation.id}/repositories?per_page=100`, connection.accessToken) as { repositories?: GitHubRepository[]; total_count?: number };
      return { installation, repositories: Array.isArray(value.repositories) ? value.repositories : [], truncated: (value.total_count || 0) > 100 };
    }));
    const items = groups.flatMap(({ installation, repositories }) => repositories.flatMap(repo => {
      if (!Number.isSafeInteger(repo.id) || typeof repo.full_name !== 'string'
        || typeof repo.clone_url !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(repo.clone_url)) return [];
      return [{ id: repo.id, fullName: repo.full_name, cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch || 'main', private: repo.private === true,
        installationId: installation.id, account: installation.account?.login || '' }];
    }));
    const response = NextResponse.json({ items, truncated: (data.total_count || 0) > 20 || groups.some(group => group.truncated) }, { headers: { 'Cache-Control': 'no-store' } });
    if (connection !== current) response.cookies.set(GITHUB_COOKIE, sealConnection(connection), githubCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: 'Repositories ophalen mislukt. Koppel GitHub opnieuw of controleer de app-installatie.' }, { status: 502 });
  }
}
