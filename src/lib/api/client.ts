import { apiPaths } from '@/lib/api/contract';
import type {
  ApiErrorBody,
  Deployment,
  Domain,
  DomainInput,
  EnvVar,
  EnvVarInput,
  LogChunk,
  Project,
  ProjectInput,
} from '@/lib/api/types';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/stack${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.assign('/app/login');
  }
  if (!response.ok) {
    throw new ApiError(data.error || 'Verzoek mislukt.', response.status, data.code);
  }
  return data;
}

function list<T>(data: T[] | { items: T[] }): T[] {
  return Array.isArray(data) ? data : data.items;
}

export const dashboardApi = {
  projects: async () => list(await request<Project[] | { items: Project[] }>(apiPaths.projects())),
  project: (id: string) => request<Project>(apiPaths.project(id)),
  createProject: (input: ProjectInput) =>
    request<Project>(apiPaths.projects(), { method: 'POST', body: JSON.stringify(input) }),
  updateProject: (id: string, input: ProjectInput) =>
    request<Project>(apiPaths.project(id), { method: 'PATCH', body: JSON.stringify(input) }),
  deleteProject: (id: string) => request<{ ok: true }>(apiPaths.project(id), { method: 'DELETE' }),
  deployments: async (id: string) => list(await request<Deployment[] | { items: Deployment[] }>(apiPaths.deployments(id))),
  deploy: (id: string) => request<Deployment>(apiPaths.deployments(id), { method: 'POST', body: '{}' }),
  logs: (id: string, deploymentId: string, cursor?: string | null) =>
    request<LogChunk>(apiPaths.logs(id, deploymentId, cursor)),
  rollback: (id: string, deploymentId: string) =>
    request<Deployment>(apiPaths.rollback(id, deploymentId), { method: 'POST', body: '{}' }),
  domains: async (id: string) => list(await request<Domain[] | { items: Domain[] }>(apiPaths.domains(id))),
  addDomain: (id: string, input: DomainInput) =>
    request<Domain>(apiPaths.domains(id), { method: 'POST', body: JSON.stringify(input) }),
  removeDomain: (id: string, domainId: string) =>
    request<{ ok: true }>(apiPaths.domain(id, domainId), { method: 'DELETE' }),
  checkDomain: (id: string, domainId: string) =>
    request<Domain>(apiPaths.checkDomain(id, domainId), { method: 'POST', body: '{}' }),
  envVars: async (id: string) => list(await request<EnvVar[] | { items: EnvVar[] }>(apiPaths.env(id))),
  createEnv: (id: string, input: EnvVarInput) =>
    request<EnvVar>(apiPaths.env(id), { method: 'POST', body: JSON.stringify(input) }),
  updateEnv: (id: string, envId: string, input: Pick<EnvVarInput, 'value' | 'environments'>) =>
    request<EnvVar>(apiPaths.envVar(id, envId), { method: 'PATCH', body: JSON.stringify(input) }),
  deleteEnv: (id: string, envId: string) =>
    request<{ ok: true }>(apiPaths.envVar(id, envId), { method: 'DELETE' }),
};
