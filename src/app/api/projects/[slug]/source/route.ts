import { Buffer } from 'node:buffer';
import { cookies } from 'next/headers';
import { portalIdentity } from '@/lib/auth/portal';
import { rejectsCrossSite } from '@/lib/auth/guard';
import { isSafeSegment } from '@/lib/api/contract';
import { GITHUB_COOKIE, githubConfig, githubCookieOptions, openConnection, refreshConnection, sealConnection } from '@/lib/github/connection';
import { readLimitedBody } from '@/lib/read-limited-body';

import { repositoryConnection } from '@/lib/github/repository-connection.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ slug: string }> };
type Source = { owner: string; repo: string; branch: string; token: string };

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function validPath(path: string): boolean {
  return path.length > 0 && path.length <= 300 && !path.startsWith('/') && !path.includes('\\')
    && path.split('/').every(part => part !== '' && part !== '.' && part !== '..' && !/[\u0000-\u001f\u007f]/.test(part));
}

async function source(slug: string): Promise<Source | Response> {
  const identity = await portalIdentity();
  if (!identity) return json({ error: 'Niet ingelogd.' }, 401);
  if (!isSafeSegment(slug)) return json({ error: 'Ongeldig project.' }, 400);
  if (process.env.DEFAULTSTACKR_MOCK === 'true') return json({ error: 'De code-editor is beschikbaar op het cloudportaal.' }, 503);
  const base = process.env.DEFAULTSTACKR_API_URL;
  const apiKey = process.env.DEFAULTSTACKR_API_KEY;
  if (!base || !apiKey) return json({ error: 'De project-API is niet geconfigureerd.' }, 503);
  let projectResponse: Response;
  try {
    const target = new URL(`api/projects/${encodeURIComponent(slug)}`, base.endsWith('/') ? base : `${base}/`);
    projectResponse = await fetch(target, {
      headers: { Authorization: `Bearer ${apiKey}`, ...(identity.kind === 'customer' ? { 'X-Defaultstackr-User-Id': identity.id } : {}) },
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
  } catch { return json({ error: 'De project-API is niet bereikbaar.' }, 502); }
  if (!projectResponse.ok) return json({ error: projectResponse.status === 404 ? 'Project niet gevonden.' : 'Projecttoegang geweigerd.' }, projectResponse.status === 404 ? 404 : 502);
  const project = await projectResponse.json().catch(() => null) as { repo_url?: unknown; branch?: unknown } | null;
  const match = typeof project?.repo_url === 'string' && /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(project.repo_url);
  if (!match || typeof project?.branch !== 'string') return json({ error: 'Dit project heeft geen geldige GitHub-repository.' }, 422);
  let token: string | null = null;
  try {
    const jar = await cookies();
    const config = githubConfig();
    const connection = config ? repositoryConnection(openConnection(jar.get(GITHUB_COOKIE)?.value), identity, config.clientId) : null;
    if (!connection) return json({ error: 'Koppel de GitHub App aan dit account om code te openen.', code: 'github_app_connection_required' }, 409);
    const refreshed = await refreshConnection(connection);
    token = refreshed.accessToken;
    if (refreshed !== connection) jar.set(GITHUB_COOKIE, sealConnection(refreshed), githubCookieOptions);
  } catch { return json({ error: 'Koppel de GitHub App opnieuw om code te openen.' }, 409); }
  return { owner: match[1], repo: match[2], branch: project.branch, token: token! };
}

function githubUrl(source: Source, path: string): string {
  const base = `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`;
  return `${base}/${path}`;
}

async function github(source: Source, path: string, init?: RequestInit): Promise<Response> {
  return fetch(githubUrl(source, path), {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${source.token}`,
      'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'DefaultStackr', ...init?.headers },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
}

export async function GET(request: Request, context: Context) {
  const { slug } = await context.params;
  const current = await source(slug);
  if (current instanceof Response) return current;
  const path = new URL(request.url).searchParams.get('path');
  try {
    if (path === null) {
      const result = await github(current, `git/trees/${encodeURIComponent(current.branch)}?recursive=1`);
      if (!result.ok) return json({ error: 'Bestanden uit GitHub ophalen mislukt.' }, result.status === 404 ? 404 : 502);
      const tree = await result.json() as { tree?: Array<{ path?: string; type?: string; size?: number }>; truncated?: boolean };
      const files = (tree.tree || []).filter(item => item.type === 'blob' && typeof item.path === 'string'
        && validPath(item.path) && (item.size ?? 0) <= 256 * 1024).slice(0, 1000)
        .map(item => ({ path: item.path, size: item.size ?? 0 }));
      return json({ files, truncated: tree.truncated === true || (tree.tree?.length ?? 0) > 1000, branch: current.branch });
    }
    if (!validPath(path)) return json({ error: 'Ongeldig bestandspad.' }, 400);
    const result = await github(current, `contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(current.branch)}`);
    if (!result.ok) return json({ error: 'Bestand ophalen mislukt.' }, result.status === 404 ? 404 : 502);
    const file = await result.json() as { type?: string; size?: number; content?: string; encoding?: string; sha?: string };
    if (file.type !== 'file' || file.encoding !== 'base64' || !file.content || !file.sha || (file.size ?? 0) > 256 * 1024) {
      return json({ error: 'Dit bestand kan niet in de editor worden geopend.' }, 415);
    }
    const bytes = Buffer.from(file.content.replace(/\s/g, ''), 'base64');
    if (bytes.length > 256 * 1024 || bytes.includes(0)) return json({ error: 'Dit is geen bewerkbaar tekstbestand.' }, 415);
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return json({ error: 'Dit is geen UTF-8-tekstbestand.' }, 415); }
    return json({ path, content, sha: file.sha, branch: current.branch });
  } catch { return json({ error: 'GitHub is tijdelijk niet bereikbaar.' }, 502); }
}

export async function PUT(request: Request, context: Context) {
  if (!request.headers.get('origin') || rejectsCrossSite(request)) return json({ error: 'Ongeldige herkomst.' }, 403);
  const { slug } = await context.params;
  const current = await source(slug);
  if (current instanceof Response) return current;
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!validPath(path)) return json({ error: 'Ongeldig bestandspad.' }, 400);
  const raw = await readLimitedBody(request, 400 * 1024);
  if (raw === null) return json({ error: 'Bestand is te groot.' }, 413);
  let body: { content?: unknown; sha?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: 'Ongeldige aanvraag.' }, 400); }
  if (typeof body.content !== 'string' || Buffer.byteLength(body.content) > 256 * 1024
    || typeof body.sha !== 'string' || !/^[a-f0-9]{40}$/.test(body.sha)) return json({ error: 'Bestand of versie is ongeldig.' }, 400);
  try {
    const result = await github(current, `contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Edit ${path} via DefaultStackr`, content: Buffer.from(body.content, 'utf8').toString('base64'), sha: body.sha, branch: current.branch }),
    });
    if (result.status === 409) return json({ error: 'Het bestand is intussen gewijzigd. Herlaad het voordat je opnieuw opslaat.' }, 409);
    if (result.status === 403) return json({ error: 'GitHub geeft geen schrijfrecht. Geef de GitHub App toegang tot Contents: read and write.' }, 403);
    if (!result.ok) return json({ error: 'GitHub heeft de commit geweigerd.' }, result.status === 404 ? 404 : 502);
    const saved = await result.json() as { content?: { sha?: string }; commit?: { sha?: string } };
    return json({ sha: saved.content?.sha, commitSha: saved.commit?.sha, path });
  } catch { return json({ error: 'GitHub is tijdelijk niet bereikbaar.' }, 502); }
}
