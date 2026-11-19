import { randomBytes, randomUUID } from 'node:crypto';
import type {
  Deployment,
  DnsRecord,
  Domain,
  DomainInput,
  DomainRedirect,
  DomainStatus,
  EnvName,
  EnvVar,
  EnvVarInput,
  LogChunk,
  LogLine,
  Owner,
  Project,
  ProjectInput,
} from '@/lib/api/types';
import { previewHostname, slugify, validateDomainInput, validateEnvInput, validateProjectInput } from '@/lib/api/validate';

type StoredEnv = EnvVar & { projectId: string; secret: string };
type StoredDomain = Domain & { locked: boolean };

type Store = {
  projects: Project[];
  deployments: Deployment[];
  domains: StoredDomain[];
  env: StoredEnv[];
};

const MASK = '••••••••' as const;
const CODED: Owner = { id: 'team_coded', name: 'CodedByDefault', kind: 'team' };
const OTHER: Owner = { id: 'team_ander', name: 'Atelier Noord', kind: 'team' };
const SAM: Owner = { id: 'user_sam', name: 'Sam de Vries', kind: 'user' };

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function edgeCname(): string {
  const configured = process.env.DEFAULTSTACKR_EDGE_CNAME?.trim();
  return configured && /^[a-z0-9.-]{1,253}$/i.test(configured) ? configured : 'edge.defaultstackr.cloud';
}

function edgeIpv4(): string {
  const configured = process.env.DEFAULTSTACKR_EDGE_IPV4?.trim();
  return configured && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(configured) ? configured : '192.0.2.40';
}

function token(): string {
  return `dsv_${randomBytes(18).toString('base64url')}`;
}

function presentDomain(domain: StoredDomain): Domain {
  const { locked: _locked, ...publicDomain } = domain;
  return publicDomain;
}

function txtHostLabel(hostname: string, kind: Domain['kind']): string {
  if (kind === 'apex') return '_defaultstackr-verify';
  const prefix = hostname.split('.').slice(0, -2).join('.');
  return `_defaultstackr-verify.${prefix}`;
}

export function buildDnsRecords(input: {
  hostname: string;
  kind: Domain['kind'];
  redirect: DomainRedirect;
  apexStyle: 'flattening' | 'alias' | 'a';
  verificationToken: string;
}): DnsRecord[] {
  const target = edgeCname();
  const records: DnsRecord[] = [];
  const routing = (host: string, fqdn: string, purpose: DnsRecord['purpose']): void => {
    if (input.kind === 'subdomain' || host !== '@') {
      records.push({ type: 'CNAME', host, fqdn, value: target, ttl: 300, purpose, flattening: false });
      return;
    }
    if (input.apexStyle === 'a') {
      records.push({ type: 'A', host: '@', fqdn, value: edgeIpv4(), ttl: 300, purpose, flattening: false });
      return;
    }
    if (input.apexStyle === 'alias') {
      records.push({ type: 'ALIAS', host: '@', fqdn, value: target, ttl: 300, purpose, flattening: false });
      return;
    }
    records.push({ type: 'CNAME', host: '@', fqdn, value: target, ttl: 300, purpose, flattening: true });
  };

  if (input.kind === 'subdomain') {
    const host = input.hostname.split('.').slice(0, -2).join('.');
    routing(host || input.hostname, input.hostname, 'routing');
  } else {
    routing('@', input.hostname, 'routing');
    if (input.redirect !== 'none') {
      records.push({
        type: 'CNAME',
        host: 'www',
        fqdn: `www.${input.hostname}`,
        value: target,
        ttl: 300,
        purpose: 'redirect',
        flattening: false,
      });
    }
  }

  records.push({
    type: 'TXT',
    host: txtHostLabel(input.hostname, input.kind),
    fqdn: `_defaultstackr-verify.${input.hostname}`,
    value: input.verificationToken,
    ttl: 300,
    purpose: 'verification',
    flattening: false,
  });
  return records;
}

function domain(partial: Omit<StoredDomain, 'records' | 'locked'> & { apexStyle: 'flattening' | 'alias' | 'a'; verificationToken: string; locked?: boolean }): StoredDomain {
  return {
    id: partial.id,
    projectId: partial.projectId,
    hostname: partial.hostname,
    kind: partial.kind,
    redirect: partial.redirect,
    status: partial.status,
    check: partial.check,
    records: buildDnsRecords(partial),
    locked: partial.locked ?? true,
  };
}

function seed(): Store {
  const projects: Project[] = [
    {
      id: 'prj_vitrine',
      name: 'Vitrine',
      slug: 'vitrine',
      repoUrl: 'https://github.com/codedbydefault/vitrine',
      branch: 'main',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      status: 'ready',
      latestDeployment: null,
      primaryHostname: 'vitrine.nl',
      previewHostname: 'vitrine.defaultstackr.cloud',
      owner: CODED,
      createdAt: ago(60 * 24 * 12),
    },
    {
      id: 'prj_winkel',
      name: 'Winkel',
      slug: 'winkel',
      repoUrl: 'https://github.com/atelier-noord/winkel',
      branch: 'main',
      buildCommand: 'npm run build',
      startCommand: 'node server.js',
      status: 'building',
      latestDeployment: null,
      primaryHostname: 'bezet.nl',
      previewHostname: 'winkel.defaultstackr.cloud',
      owner: OTHER,
      createdAt: ago(60 * 24 * 4),
    },
    {
      id: 'prj_notes',
      name: 'Notities',
      slug: 'notities',
      repoUrl: 'https://github.com/samdevries/notities',
      branch: 'develop',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      status: 'idle',
      latestDeployment: null,
      primaryHostname: null,
      previewHostname: 'notities.defaultstackr.cloud',
      owner: SAM,
      createdAt: ago(90),
    },
  ];

  const deployments: Deployment[] = [
    {
      id: 'dep_vitrine_live',
      projectId: 'prj_vitrine',
      status: 'ready',
      createdAt: ago(80),
      finishedAt: ago(74),
      commitSha: 'a1b2c3d',
      commitMessage: 'Toon de collectie op de homepage',
      branch: 'main',
      triggeredBy: 'git',
      current: true,
    },
    {
      id: 'dep_vitrine_prev',
      projectId: 'prj_vitrine',
      status: 'ready',
      createdAt: ago(60 * 26),
      finishedAt: ago(60 * 26 - 6),
      commitSha: '91aa004',
      commitMessage: 'Vorige winkelmand',
      branch: 'main',
      triggeredBy: 'manual',
      current: false,
    },
    {
      id: 'dep_vitrine_fail',
      projectId: 'prj_vitrine',
      status: 'failed',
      createdAt: ago(60 * 30),
      finishedAt: ago(60 * 30 - 2),
      commitSha: 'ff0031a',
      commitMessage: 'Build faalde op een typefout',
      branch: 'main',
      triggeredBy: 'git',
      current: false,
    },
    {
      id: 'dep_winkel_build',
      projectId: 'prj_winkel',
      status: 'building',
      createdAt: new Date().toISOString(),
      finishedAt: null,
      commitSha: 'c0ffee1',
      commitMessage: 'Nieuwe checkout',
      branch: 'main',
      triggeredBy: 'manual',
      current: true,
    },
  ];

  const domains: StoredDomain[] = [
    domain({
      id: 'dom_vitrine_apex',
      projectId: 'prj_vitrine',
      hostname: 'vitrine.nl',
      kind: 'apex',
      redirect: 'apex_to_www',
      status: 'live',
      check: { code: 'ok', message: null, checkedAt: ago(18) },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_apex_token',
    }),
    domain({
      id: 'dom_vitrine_api',
      projectId: 'prj_vitrine',
      hostname: 'api.vitrine.nl',
      kind: 'subdomain',
      redirect: 'none',
      status: 'ssl_active',
      check: { code: 'ok', message: null, checkedAt: ago(40) },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_api_token',
    }),
    domain({
      id: 'dom_vitrine_blog',
      projectId: 'prj_vitrine',
      hostname: 'blog.vitrine.nl',
      kind: 'subdomain',
      redirect: 'none',
      status: 'verified',
      check: { code: 'ok', message: null, checkedAt: ago(55) },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_blog_token',
    }),
    domain({
      id: 'dom_vitrine_status',
      projectId: 'prj_vitrine',
      hostname: 'status.vitrine.nl',
      kind: 'subdomain',
      redirect: 'none',
      status: 'pending_verification',
      check: { code: 'ok', message: null, checkedAt: ago(5) },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_status_token',
    }),
    domain({
      id: 'dom_vitrine_wrong',
      projectId: 'prj_vitrine',
      hostname: 'oud.vitrine.nl',
      kind: 'subdomain',
      redirect: 'none',
      status: 'pending_verification',
      check: {
        code: 'wrong_record',
        message: 'Het DNS-record komt niet overeen. De CNAME wijst nog naar een oude host.',
        checkedAt: ago(9),
      },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_wrong_token',
    }),
    domain({
      id: 'dom_vitrine_wait',
      projectId: 'prj_vitrine',
      hostname: 'nieuw.vitrine.nl',
      kind: 'subdomain',
      redirect: 'none',
      status: 'pending_verification',
      check: {
        code: 'propagation_pending',
        message: 'Het record is nog niet overal zichtbaar. DNS-propagatie kan even duren.',
        checkedAt: ago(3),
      },
      apexStyle: 'flattening',
      verificationToken: 'dsv_vitrine_wait_token',
    }),
    domain({
      id: 'dom_vitrine_alias',
      projectId: 'prj_vitrine',
      hostname: 'klant.nl',
      kind: 'apex',
      redirect: 'www_to_apex',
      status: 'verified',
      check: { code: 'ok', message: null, checkedAt: ago(70) },
      apexStyle: 'alias',
      verificationToken: 'dsv_klant_alias_token',
    }),
    domain({
      id: 'dom_vitrine_claimed',
      projectId: 'prj_vitrine',
      hostname: 'bezet.nl',
      kind: 'apex',
      redirect: 'none',
      status: 'pending_verification',
      check: {
        code: 'already_claimed',
        message: 'Dit domein is al gekoppeld aan een ander project nadat de TXT-controle daar slaagde.',
        checkedAt: ago(12),
      },
      apexStyle: 'a',
      verificationToken: 'dsv_bezet_attempt_token',
    }),
    domain({
      id: 'dom_winkel_apex',
      projectId: 'prj_winkel',
      hostname: 'bezet.nl',
      kind: 'apex',
      redirect: 'www_to_apex',
      status: 'live',
      check: { code: 'ok', message: null, checkedAt: ago(60 * 20) },
      apexStyle: 'a',
      verificationToken: 'dsv_bezet_owner_token',
    }),
  ];

  const env: StoredEnv[] = [
    {
      id: 'env_vitrine_db',
      projectId: 'prj_vitrine',
      key: 'DATABASE_URL',
      environments: ['production'],
      maskedValue: MASK,
      updatedAt: ago(400),
      secret: 'postgres://vitrine:super-secret-db-password@127.0.0.1/vitrine',
    },
    {
      id: 'env_vitrine_site',
      projectId: 'prj_vitrine',
      key: 'NEXT_PUBLIC_SITE_URL',
      environments: ['production', 'preview'],
      maskedValue: MASK,
      updatedAt: ago(200),
      secret: 'https://vitrine.nl',
    },
    {
      id: 'env_winkel_key',
      projectId: 'prj_winkel',
      key: 'STRIPE_SECRET_KEY',
      environments: ['production', 'preview', 'development'],
      maskedValue: MASK,
      updatedAt: ago(30),
      secret: 'sk_live_mock_do_not_show',
    },
  ];

  for (const project of projects) attachLatest(project, deployments);
  return { projects, deployments, domains, env };
}

function attachLatest(project: Project, deployments: Deployment[]): void {
  const latest = deployments
    .filter(item => item.projectId === project.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  project.latestDeployment = latest
    ? { id: latest.id, status: latest.status, createdAt: latest.createdAt, commitMessage: latest.commitMessage }
    : null;
  if (latest?.status === 'building' || latest?.status === 'queued') project.status = 'building';
}

const store: Store = seed();

function jsonError(error: string, status: number, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  if (text.length > 20_000) throw new Error('payload');
  return JSON.parse(text) as unknown;
}

function findProject(id: string): Project | undefined {
  return store.projects.find(project => project.id === id);
}

function publicEnv(item: StoredEnv): EnvVar {
  return { id: item.id, key: item.key, environments: item.environments, maskedValue: MASK, updatedAt: item.updatedAt };
}

function verifiedClaim(hostname: string, exceptProjectId?: string): StoredDomain | undefined {
  return store.domains.find(item =>
    item.hostname === hostname
    && item.projectId !== exceptProjectId
    && item.check.code === 'ok'
    && item.status !== 'pending_verification',
  );
}

function syncPrimary(project: Project): void {
  const live = store.domains.find(item => item.projectId === project.id && item.status === 'live' && item.check.code === 'ok');
  project.primaryHostname = live?.hostname ?? null;
}

const LOG_SCRIPT = [
  'Repository klonen',
  'Afhankelijkheid installeren',
  'Build-commando uitvoeren',
  'Build geslaagd',
  'Container starten op poort 8080',
  'Healthcheck /healthz beantwoordt',
  'Uitrol klaar',
];

function logsFor(deployment: Deployment): LogLine[] {
  const started = Date.parse(deployment.createdAt);
  const finished = deployment.finishedAt ? Date.parse(deployment.finishedAt) : Date.now();
  const steps = deployment.status === 'building' || deployment.status === 'queued'
    ? Math.min(LOG_SCRIPT.length - 1, Math.max(1, Math.floor((Date.now() - started) / 1200) + 1))
    : LOG_SCRIPT.length;
  const lines: LogLine[] = LOG_SCRIPT.slice(0, steps).map((message, index) => ({
    id: `${deployment.id}-log-${index}`,
    timestamp: new Date(started + index * 1000).toISOString(),
    level: 'info',
    message,
  }));
  if (deployment.status === 'failed') {
    lines.push({
      id: `${deployment.id}-log-error`,
      timestamp: new Date(finished).toISOString(),
      level: 'error',
      message: 'Build gestopt. Zie de typefout in de laatste commit.',
    });
  }
  return lines;
}

function advance(status: DomainStatus): DomainStatus {
  const order: DomainStatus[] = ['pending_verification', 'verified', 'ssl_active', 'live'];
  const index = order.indexOf(status);
  return order[Math.min(order.length - 1, index + 1)] ?? status;
}

function uniqueSlug(name: string): string {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (store.projects.some(project => project.slug === slug)) {
    slug = `${base}-${suffix}`.slice(0, 48);
    suffix += 1;
  }
  return slug;
}

export async function mockHandle(request: Request, segments: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  try {
    if (segments[0] === 'operations' && segments.length === 1 && method === 'GET') return ok({ checks: [], events: [], backups: [] });
    if (segments[0] === 'projects' && segments.length === 1 && method === 'GET') {
      return ok(store.projects);
    }
    if (segments[0] === 'projects' && segments.length === 1 && method === 'POST') {
      const body = await readBody(request) as Partial<ProjectInput>;
      const error = validateProjectInput(body);
      if (error || !body.name) return jsonError(error ?? 'Ongeldig project.', 400);
      const slug = uniqueSlug(body.name);
      const project: Project = {
        id: `prj_${randomUUID().slice(0, 8)}`,
        name: body.name.trim(),
        slug,
        repoUrl: body.repoUrl!.trim(),
        branch: body.branch!.trim(),
        buildCommand: body.buildCommand!.trim(),
        startCommand: body.startCommand!.trim(),
        status: 'idle',
        latestDeployment: null,
        primaryHostname: null,
        previewHostname: previewHostname(slug),
        owner: CODED,
        createdAt: new Date().toISOString(),
      };
      store.projects.unshift(project);
      return ok(project, 201);
    }

    const project = segments[0] === 'projects' ? findProject(segments[1] ?? '') : undefined;
    if (segments[0] === 'projects' && segments[1] && !project) return jsonError('Project niet gevonden.', 404);
    if (!project) return jsonError('Onbekend pad.', 404);

    if (segments.length === 2 && method === 'GET') return ok(project);
    if (segments.length === 2 && method === 'PATCH') {
      const body = await readBody(request) as Partial<ProjectInput>;
      const next: ProjectInput = {
        name: body.name ?? project.name,
        repoUrl: body.repoUrl ?? project.repoUrl,
        branch: body.branch ?? project.branch,
        buildCommand: body.buildCommand ?? project.buildCommand,
        startCommand: body.startCommand ?? project.startCommand,
      };
      const error = validateProjectInput(next);
      if (error) return jsonError(error, 400);
      project.name = next.name.trim();
      project.repoUrl = next.repoUrl.trim();
      project.branch = next.branch.trim();
      project.buildCommand = next.buildCommand.trim();
      project.startCommand = next.startCommand.trim();
      return ok(project);
    }
    if (segments.length === 2 && method === 'DELETE') {
      store.projects.splice(store.projects.indexOf(project), 1);
      store.deployments = store.deployments.filter(item => item.projectId !== project.id);
      store.domains = store.domains.filter(item => item.projectId !== project.id);
      store.env = store.env.filter(item => item.projectId !== project.id);
      return ok({ ok: true });
    }

    if (segments[2] === 'deployments' && segments.length === 3 && method === 'GET') {
      const items = store.deployments.filter(item => item.projectId === project.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return ok(items);
    }
    if (segments[2] === 'deployments' && segments.length === 3 && method === 'POST') {
      for (const item of store.deployments) if (item.projectId === project.id) item.current = false;
      const deployment: Deployment = {
        id: `dep_${randomUUID().slice(0, 8)}`,
        projectId: project.id,
        status: 'building',
        createdAt: new Date().toISOString(),
        finishedAt: null,
        commitSha: null,
        commitMessage: 'Handmatige uitrol',
        branch: project.branch,
        triggeredBy: 'manual',
        current: true,
      };
      store.deployments.unshift(deployment);
      project.status = 'building';
      attachLatest(project, store.deployments);
      return ok(deployment, 201);
    }
    if (segments[2] === 'deployments' && segments[4] === 'logs' && method === 'GET') {
      const deployment = store.deployments.find(item => item.id === segments[3] && item.projectId === project.id);
      if (!deployment) return jsonError('Uitrol niet gevonden.', 404);
      // TODO(defaultstackr-api): honor ?cursor= and return nextCursor once logs are streamed.
      const chunk: LogChunk = { deploymentId: deployment.id, status: deployment.status, lines: logsFor(deployment), nextCursor: null };
      return ok(chunk);
    }
    if (segments[2] === 'deployments' && segments[4] === 'runtime-logs' && method === 'GET') {
      const deployment = store.deployments.find(item => item.id === segments[3] && item.projectId === project.id);
      if (!deployment) return jsonError('Uitrol niet gevonden.', 404);
      return ok({ deploymentId: deployment.id, status: deployment.status, lines: [], nextCursor: null });
    }
    if (segments[2] === 'deployments' && segments[4] === 'rollback' && method === 'POST') {
      const deployment = store.deployments.find(item => item.id === segments[3] && item.projectId === project.id);
      if (!deployment) return jsonError('Uitrol niet gevonden.', 404);
      if (deployment.status !== 'ready' || deployment.current) return jsonError('Deze uitrol kan niet worden teruggezet.', 409);
      for (const item of store.deployments) if (item.projectId === project.id) item.current = false;
      deployment.current = true;
      deployment.triggeredBy = 'rollback';
      project.status = 'ready';
      attachLatest(project, store.deployments);
      return ok(deployment);
    }

    if (segments[2] === 'domains' && segments.length === 3 && method === 'GET') {
      return ok(store.domains.filter(item => item.projectId === project.id).map(presentDomain));
    }
    if (segments[2] === 'domains' && segments.length === 3 && method === 'POST') {
      const parsed = validateDomainInput(await readBody(request) as Partial<DomainInput>);
      if ('error' in parsed) return jsonError(parsed.error, 400);
      if (store.domains.some(item => item.projectId === project.id && item.hostname === parsed.hostname)) {
        return jsonError('Dit domein staat al op dit project.', 409, 'duplicate');
      }
      if (verifiedClaim(parsed.hostname, project.id)) {
        return jsonError('Dit domein is al gekoppeld aan een ander project nadat de TXT-controle daar slaagde.', 409, 'already_claimed');
      }
      const created = domain({
        id: `dom_${randomUUID().slice(0, 8)}`,
        projectId: project.id,
        hostname: parsed.hostname,
        kind: parsed.value.kind,
        redirect: parsed.value.redirect,
        status: 'pending_verification',
        check: { code: 'ok', message: null, checkedAt: null },
        apexStyle: 'flattening',
        verificationToken: token(),
        locked: false,
      });
      store.domains.unshift(created);
      return ok(presentDomain(created), 201);
    }
    if (segments[2] === 'domains' && segments.length === 4 && method === 'DELETE') {
      const index = store.domains.findIndex(item => item.id === segments[3] && item.projectId === project.id);
      if (index < 0) return jsonError('Domein niet gevonden.', 404);
      store.domains.splice(index, 1);
      syncPrimary(project);
      return ok({ ok: true });
    }
    if (segments[2] === 'domains' && segments[4] === 'check' && method === 'POST') {
      const item = store.domains.find(entry => entry.id === segments[3] && entry.projectId === project.id);
      if (!item) return jsonError('Domein niet gevonden.', 404);
      item.check.checkedAt = new Date().toISOString();
      if (!item.locked && item.check.code === 'ok') {
        const next = advance(item.status);
        if (next !== 'pending_verification' && verifiedClaim(item.hostname, project.id)) {
          item.check.code = 'already_claimed';
          item.check.message = 'Dit domein is al gekoppeld aan een ander project nadat de TXT-controle daar slaagde.';
          item.status = 'pending_verification';
        } else {
          item.status = next;
          if (next !== 'pending_verification') item.check.message = null;
        }
      }
      syncPrimary(project);
      return ok(presentDomain(item));
    }

    if (segments[2] === 'env' && segments.length === 3 && method === 'GET') {
      return ok(store.env.filter(item => item.projectId === project.id).map(publicEnv));
    }
    if (segments[2] === 'env' && segments.length === 3 && method === 'POST') {
      const body = await readBody(request) as Partial<EnvVarInput>;
      const error = validateEnvInput(body, true);
      if (error || !body.key || !body.value || !body.environments) return jsonError(error ?? 'Ongeldige variabele.', 400);
      const existing = store.env.find(item => item.projectId === project.id && item.key === body.key);
      if (existing) {
        existing.secret = body.value;
        existing.environments = [...new Set(body.environments)] as EnvName[];
        existing.updatedAt = new Date().toISOString();
        return ok(publicEnv(existing));
      }
      const created: StoredEnv = {
        id: `env_${project.id}_${randomUUID().slice(0, 8)}`,
        projectId: project.id,
        key: body.key,
        environments: [...new Set(body.environments)] as EnvName[],
        maskedValue: MASK,
        updatedAt: new Date().toISOString(),
        secret: body.value,
      };
      store.env.unshift(created);
      return ok(publicEnv(created), 201);
    }
    if (segments[2] === 'env' && segments.length === 4 && method === 'PATCH') {
      const item = store.env.find(entry => entry.id === segments[3] && entry.projectId === project.id);
      if (!item) return jsonError('Variabele niet gevonden.', 404);
      const body = await readBody(request) as Partial<EnvVarInput>;
      const error = validateEnvInput({ key: item.key, value: body.value, environments: body.environments ?? item.environments }, body.value !== undefined);
      if (error) return jsonError(error, 400);
      if (typeof body.value === 'string') item.secret = body.value;
      if (body.environments) item.environments = [...new Set(body.environments)] as EnvName[];
      item.updatedAt = new Date().toISOString();
      return ok(publicEnv(item));
    }
    if (segments[2] === 'env' && segments.length === 4 && method === 'DELETE') {
      const index = store.env.findIndex(entry => entry.id === segments[3] && entry.projectId === project.id);
      if (index < 0) return jsonError('Variabele niet gevonden.', 404);
      store.env.splice(index, 1);
      return ok({ ok: true });
    }

    return jsonError('Onbekend pad.', 404);
  } catch {
    return jsonError('Ongeldige aanvraag.', 400);
  }
}

