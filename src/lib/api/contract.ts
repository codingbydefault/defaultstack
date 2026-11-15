/**
 * TODO(defaultstackr-api): provisional HTTP contract for
 * codingbydefault/defaultstackr-api. Adjust only this file and the normalizer
 * in upstream.ts when the Express routes land. The browser calls the same
 * paths under /api/stack, and the Next.js server adds
 * `Authorization: Bearer ${DEFAULTSTACKR_API_KEY}`.
 *
 * Auth on Express already accepts that Bearer header. These paths do not
 * exist there yet (the API still exposes /api/:table and GET /health).
 *
 *   GET    /v1/projects
 *   POST   /v1/projects                         { name, repoUrl, branch, buildCommand, startCommand }
 *   GET    /v1/projects/:id
 *   PATCH  /v1/projects/:id                     partial project fields, not owner
 *   DELETE /v1/projects/:id
 *   GET    /v1/projects/:id/deployments
 *   POST   /v1/projects/:id/deployments         redeploy the configured branch
 *   GET    /v1/projects/:id/deployments/:deploymentId/logs?cursor=
 *   POST   /v1/projects/:id/deployments/:deploymentId/rollback
 *   GET    /v1/projects/:id/domains
 *   POST   /v1/projects/:id/domains             { hostname, kind: apex|subdomain, redirect: none|apex_to_www|www_to_apex }
 *   DELETE /v1/projects/:id/domains/:domainId
 *   POST   /v1/projects/:id/domains/:domainId/check
 *   GET    /v1/projects/:id/env                 masked values only, never the secret
 *   POST   /v1/projects/:id/env                 { key, value, environments[] }
 *   PATCH  /v1/projects/:id/env/:envId          { value?, environments? }
 *   DELETE /v1/projects/:id/env/:envId
 *
 * Domain records are chosen by the API. Apex routing is one of:
 *   - CNAME at @ with flattening: true (Cloudflare CNAME flattening)
 *   - ALIAS / ANAME at @
 *   - A at @ with the edge IPv4 address
 * Subdomains are a CNAME. Every custom hostname also gets
 * TXT `_defaultstackr-verify.<hostname>` = token.
 * A hostname can belong to only one project once TXT verification succeeds.
 * Conflicts respond with 409 and `{ "error": "...", "code": "already_claimed" }`.
 *
 * List responses may be a bare array or `{ items: [...] }`.
 * TODO(defaultstackr-api): confirm the envelope, id field (`id` today; `_id` accepted),
 * and log cursor name.
 */

export const API_PREFIX = '/v1';

export const apiPaths = {
  projects: () => `${API_PREFIX}/projects`,
  project: (id: string) => `${API_PREFIX}/projects/${encodeURIComponent(id)}`,
  deployments: (id: string) => `${API_PREFIX}/projects/${encodeURIComponent(id)}/deployments`,
  logs: (id: string, deploymentId: string, cursor?: string | null) => {
    const path = `${API_PREFIX}/projects/${encodeURIComponent(id)}/deployments/${encodeURIComponent(deploymentId)}/logs`;
    return cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path;
  },
  rollback: (id: string, deploymentId: string) =>
    `${API_PREFIX}/projects/${encodeURIComponent(id)}/deployments/${encodeURIComponent(deploymentId)}/rollback`,
  domains: (id: string) => `${API_PREFIX}/projects/${encodeURIComponent(id)}/domains`,
  domain: (id: string, domainId: string) =>
    `${API_PREFIX}/projects/${encodeURIComponent(id)}/domains/${encodeURIComponent(domainId)}`,
  checkDomain: (id: string, domainId: string) =>
    `${API_PREFIX}/projects/${encodeURIComponent(id)}/domains/${encodeURIComponent(domainId)}/check`,
  env: (id: string) => `${API_PREFIX}/projects/${encodeURIComponent(id)}/env`,
  envVar: (id: string, envId: string) =>
    `${API_PREFIX}/projects/${encodeURIComponent(id)}/env/${encodeURIComponent(envId)}`,
};

export function isSafeSegment(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}
