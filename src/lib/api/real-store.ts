import type { Deployment, DnsRecord, Domain, DomainRoutingOption, EnvName, EnvVar, Project, ProjectInput } from '@/lib/api/types';
import { slugify } from '@/lib/api/validate';

type Row = Record<string, unknown>;

class ApiFailure extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function list(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(row) : [];
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function date(value: unknown): string {
  return string(value, new Date(0).toISOString());
}

function response(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function toDeployment(raw: Row, slug: string, project: Row): Deployment {
  return {
    id: String(raw.id),
    projectId: slug,
    status: raw.status === 'queued' || raw.status === 'building' || raw.status === 'ready' || raw.status === 'failed' ? raw.status : 'failed',
    createdAt: date(raw.created_at),
    finishedAt: raw.finished_at ? string(raw.finished_at) : null,
    commitSha: raw.commit_sha ? string(raw.commit_sha) : null,
    commitMessage: null,
    branch: string(project.branch, 'main'),
    triggeredBy: raw.job_type === 'rollback' ? 'rollback' : 'manual',
    current: String(raw.id) === String(project.current_deployment_id),
  };
}

function toProject(raw: Row, latest?: Row, actorUserId: string | null = null): Project {
  const slug = string(raw.slug);
  const deployment = latest ? toDeployment(latest, slug, raw) : null;
  return {
    id: slug,
    slug,
    name: string(raw.name),
    repoUrl: string(raw.repo_url),
    branch: string(raw.branch, 'main'),
    buildCommand: string(raw.build_command),
    startCommand: string(raw.start_command),
    installCommand: string(raw.install_command, 'npm ci'),
    healthPath: string(raw.health_path, '/'),
    framework: string(raw.framework, 'next'),
    status: deployment?.status === 'queued' || deployment?.status === 'building' ? 'building' : deployment?.status === 'failed' ? 'failed' : raw.current_deployment_id ? 'ready' : 'idle',
    hasLiveDeployment: Boolean(raw.current_deployment_id),
    latestDeployment: deployment ? { id: deployment.id, status: deployment.status, createdAt: deployment.createdAt, commitMessage: null } : null,
    primaryHostname: null,
    previewHostname: `${slug}.defaultstackr.cloud`,
    owner: actorUserId ? { id: actorUserId, name: 'Jij', kind: 'user' } : { id: 'admin', name: 'CodedByDefault', kind: 'team' },
    createdAt: date(raw.created_at),
  };
}

function recordHost(fqdn: string): string {
  return fqdn.split('.').slice(0, -2).join('.') || '@';
}

function toRecords(value: unknown): DnsRecord[] {
  const source = row(value);
  const ownership = row(source.ownership);
  const routing = row(source.routing);
  const inputs: Row[] = [
    ...(ownership.name ? [{ ...ownership, purpose: 'verification' }] : []),
    ...list(routing.records).map(item => ({ ...item, purpose: 'routing' })),
  ];
  return inputs.flatMap(item => {
    const fqdn = string(item.name);
    const value = string(item.value);
    const type = string(item.type);
    if (!fqdn || !value || !['A', 'CNAME', 'ALIAS', 'TXT'].includes(type)) return [];
    return [{ type: type as DnsRecord['type'], host: recordHost(fqdn), fqdn, value, ttl: 300, purpose: item.purpose as DnsRecord['purpose'], flattening: false }];
  });
}

function toRoutingOptions(value: unknown): DomainRoutingOption[] {
  const options = list(row(row(value).routing).apex_options);
  return options.flatMap(option => {
    const type = string(option.type);
    const hostname = string(option.name);
    if ((type !== 'CNAME' && type !== 'NS') || !hostname) return [];
    return [{ id: string(option.id, hostname), type, hostname, value: typeof option.value === 'string' ? option.value : null, note: string(option.note) }];
  });
}

function toDomain(raw: Row, records: unknown): Domain {
  const status = string(raw.status);
  const hostname = string(raw.hostname);
  const live = status === 'live' || status === 'verified' || status === 'ssl_active';
  return {
    id: String(raw.id),
    projectId: String(raw.project_id),
    hostname,
    kind: hostname.split('.').length === 2 ? 'apex' : 'subdomain',
    redirect: 'none',
    status: live ? status as Domain['status'] : 'pending_verification',
    check: {
      code: live ? 'ok' : status === 'error' ? 'wrong_record' : 'propagation_pending',
      message: raw.reason ? string(raw.reason) : null,
      checkedAt: raw.last_checked_at ? string(raw.last_checked_at) : null,
    },
    records: toRecords(records),
    routingOptions: toRoutingOptions(records),
  };
}

function toEnv(raw: Row): EnvVar {
  const environment = string(raw.environment) as EnvName;
  const key = string(raw.key);
  return {
    id: `${environment}__${key}`,
    key,
    environments: [environment],
    maskedValue: '••••••••',
    updatedAt: date(raw.updated_at),
  };
}

export async function handleRealApi(request: Request, segments: string[], actorUserId: string | null = null): Promise<Response> {
  const base = process.env.DEFAULTSTACKR_API_URL;
  const apiKey = process.env.DEFAULTSTACKR_API_KEY;
  if (!base || !apiKey) {
    return response({ error: 'De API is niet geconfigureerd. Zet DEFAULTSTACKR_API_URL en DEFAULTSTACKR_API_KEY.' }, 503);
  }
  const key = apiKey;
  let baseUrl: URL;
  try {
    baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) throw new Error('Invalid API URL');
  } catch {
    return response({ error: 'DEFAULTSTACKR_API_URL is ongeldig.' }, 503);
  }

  async function call(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const target = new URL(path, baseUrl);
    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method,
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}`, ...(actorUserId ? { 'X-Defaultstackr-User-Id': actorUserId } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ApiFailure(502, 'De lokale API is niet bereikbaar.');
    }
    const text = await upstream.text();
    if (text.includes(key)) throw new ApiFailure(502, 'De API-respons is tegengehouden.');
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new ApiFailure(502, 'De API gaf geen JSON terug.'); }
    if (!upstream.ok) throw new ApiFailure(upstream.status, string(row(data).error, 'API-verzoek mislukt.'));
    return data;
  }

  const [, resource, slug, section, item, action] = segments;
  const method = request.method.toUpperCase();
  const projectPath = slug ? `api/projects/${encodeURIComponent(slug)}` : 'api/projects';
  try {
    if (resource === 'operations' && !slug && method === 'GET') {
      if (actorUserId) return response({ error: 'Geen toegang.' }, 403);
      const source = row(await call('api/operations'));
      return response({
        checks: list(source.checks).map(item => ({ code: string(item.code), status: string(item.status), message: string(item.message), checkedAt: date(item.checked_at) })),
        events: list(source.events).map(item => ({ id: String(item.id), source: string(item.source), severity: string(item.severity), message: string(item.message), createdAt: date(item.created_at) })),
        backups: list(source.backups).map(item => ({ id: String(item.id), filename: string(item.filename), sizeBytes: Number(item.size_bytes) || 0, createdAt: date(item.created_at) })),
      });
    }
    if (resource !== 'projects') return response({ error: 'Onbekende API-route.' }, 404);
    if (!slug && method === 'GET') {
      const projects = list(await call(projectPath));
      return response(await Promise.all(projects.map(async project => {
        const deployments = list(await call(`api/projects/${encodeURIComponent(string(project.slug))}/deployments`));
        return toProject(project, deployments[0], actorUserId);
      })));
    }
    if (!slug && method === 'POST') {
      const input = row(await request.json());
      const name = string(input.name);
      const created = row(await call(projectPath, 'POST', {
        slug: string(input.slug) || slugify(name), name, repo_url: input.repoUrl,
        branch: input.branch, framework: input.framework || 'next',
        install_command: input.installCommand || 'npm ci', build_command: input.buildCommand,
        start_command: input.startCommand, health_path: input.healthPath || '/',
      }));
      return response(toProject(row(created.project), undefined, actorUserId), 201);
    }
    if (!slug) return response({ error: 'Onbekende API-route.' }, 404);
    if (section === 'database' && !item && method === 'GET') {
      return response(await call(`${projectPath}/database`));
    }
    if (section === 'migrations' && !item) {
      if (method === 'GET') {
        return response(list(await call(`${projectPath}/migrations`)).map(item => ({
          name: string(item.name), checksum: string(item.checksum), appliedAt: date(item.applied_at),
        })));
      }
      if (method === 'POST') {
        const input = row(await request.json());
        const applied = row(await call(`${projectPath}/migrations`, 'POST', {
          name: input.name, sql: input.sql,
        }));
        return response({
          name: string(applied.name), checksum: string(applied.checksum),
          appliedAt: date(applied.applied_at), alreadyApplied: applied.already_applied === true,
        }, 201);
      }
    }
    if (!section && method === 'GET') {
      const project = row(await call(projectPath));
      const deployments = list(await call(`${projectPath}/deployments`));
      return response(toProject(project, deployments[0], actorUserId));
    }
    if (!section && method === 'PATCH') {
      const input = row(await request.json());
      const project = row(await call(projectPath, 'PATCH', {
        name: input.name, repo_url: input.repoUrl, branch: input.branch,
        build_command: input.buildCommand, start_command: input.startCommand,
      }));
      return response(toProject(project, undefined, actorUserId));
    }
    if (!section && method === 'DELETE') {
      await call(projectPath, 'DELETE');
      return response({ ok: true });
    }
    if (section === 'deployments') {
      if (!item && method === 'POST') {
        const project = row(await call(projectPath));
        return response(toDeployment(row(await call(`${projectPath}/deployments`, 'POST')), slug, project), 202);
      }
      if (!item && method === 'GET') {
        const [project, deployments] = await Promise.all([call(projectPath), call(`${projectPath}/deployments`)]);
        return response(list(deployments).map(deployment => toDeployment(deployment, slug, row(project))));
      }
      if (item && action === 'logs' && method === 'GET') {
        const [deployment, logs] = await Promise.all([call(`${projectPath}/deployments/${item}`), call(`${projectPath}/deployments/${item}/logs`)]);
        const content = string(row(logs).logs);
        return response({ deploymentId: item, status: row(deployment).status, lines: content.split('\n').filter(Boolean).map((message, index) => ({ id: String(index), timestamp: null, level: /error|failed/i.test(message) ? 'error' : /warn/i.test(message) ? 'warn' : 'info', message })), nextCursor: null });
      }
      if (item && action === 'runtime-logs' && method === 'GET') {
        const [deployment, logs] = await Promise.all([call(`${projectPath}/deployments/${item}`), call(`${projectPath}/deployments/${item}/runtime-logs`)]);
        const source = row(logs);
        const toLines = (value: unknown, level: 'info' | 'error', prefix: string) => string(value).split('\n').filter(Boolean).map((message, index) => ({ id: `${prefix}-${index}`, timestamp: null, level, message: `[${prefix}] ${message}` }));
        return response({ deploymentId: item, status: row(deployment).status, lines: [...toLines(source.stdout, 'info', 'out'), ...toLines(source.stderr, 'error', 'err')], nextCursor: null });
      }
      if (item && action === 'rollback' && method === 'POST') {
        const project = row(await call(projectPath));
        return response(toDeployment(row(await call(`${projectPath}/rollback`, 'POST', { deployment_id: Number(item) })), slug, project), 202);
      }
    }
    if (section === 'domains') {
      if (!item && method === 'GET') return response(list(await call(`${projectPath}/domains`)).map(domain => toDomain(domain, domain.records)));
      if (!item && method === 'POST') {
        const input = row(await request.json());
        const created = row(await call(`${projectPath}/domains`, 'POST', { hostname: input.hostname }));
        return response(toDomain(row(created.domain), created.records), 201);
      }
      if (item && !action && method === 'DELETE') {
        await call(`${projectPath}/domains/${item}`, 'DELETE');
        return response({ ok: true });
      }
      if (item && action === 'check' && method === 'POST') {
        const checked = row(await call(`${projectPath}/domains/${item}/check`, 'POST'));
        return response(toDomain(row(checked.domain), checked.records));
      }
    }
    if (section === 'env') {
      if (!item && method === 'GET') {
        const environments: EnvName[] = ['production', 'preview', 'development'];
        const results = await Promise.all(environments.map(environment => call(`${projectPath}/env?environment=${environment}`)));
        return response(results.flatMap(result => list(row(result).variables).map(toEnv)));
      }
      if (!item && method === 'POST') {
        const input = row(await request.json());
        const environments = Array.isArray(input.environments) ? input.environments.filter(value => value === 'production' || value === 'preview' || value === 'development') as EnvName[] : [];
        if (!environments.length) return response({ error: 'Kies minstens één omgeving.' }, 400);
        let last: Row = {};
        for (const environment of environments) last = row(await call(`${projectPath}/env`, 'PUT', { key: input.key, value: input.value, environment }));
        return response(toEnv(last), 201);
      }
      if (item && (method === 'PATCH' || method === 'DELETE')) {
        const match = /^(production|preview|development)__(.+)$/.exec(item);
        if (!match) return response({ error: 'Ongeldige variabele.' }, 400);
        const [, environment, key] = match;
        if (method === 'DELETE') {
          await call(`${projectPath}/env`, 'DELETE', { key, environment });
          return response({ ok: true });
        }
        const input = row(await request.json());
        return response(toEnv(row(await call(`${projectPath}/env`, 'PUT', { key, environment, value: input.value }))));
      }
    }
    return response({ error: 'Onbekende API-route.' }, 404);
  } catch (error) {
    if (error instanceof ApiFailure) return response({ error: error.message }, error.status);
    return response({ error: 'API-verzoek mislukt.' }, 502);
  }
}
