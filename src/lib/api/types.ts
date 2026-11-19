// Provisional dashboard contract. Shapes are normalized in this module so the
// UI does not follow temporary Express field names. See contract.ts for the
// paths the other agent is expected to implement.

export type ProjectStatus = 'idle' | 'building' | 'ready' | 'failed';
export type DeploymentStatus = 'queued' | 'building' | 'ready' | 'failed' | 'canceled';
export type EnvName = 'production' | 'preview' | 'development';
export type DomainKind = 'apex' | 'subdomain';
export type DomainRedirect = 'none' | 'apex_to_www' | 'www_to_apex';
export type DomainStatus = 'pending_verification' | 'verified' | 'ssl_active' | 'live';
export type DomainCheckCode = 'ok' | 'wrong_record' | 'propagation_pending' | 'already_claimed';
export type DnsRecordType = 'A' | 'CNAME' | 'ALIAS' | 'TXT';

export type Owner = {
  id: string;
  name: string;
  kind: 'team' | 'user';
};

export type LatestDeployment = {
  id: string;
  status: DeploymentStatus;
  createdAt: string;
  commitMessage: string | null;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  repoUrl: string;
  branch: string;
  buildCommand: string;
  startCommand: string;
  installCommand?: string;
  healthPath?: string;
  framework?: string;
  status: ProjectStatus;
  latestDeployment: LatestDeployment | null;
  primaryHostname: string | null;
  previewHostname: string;
  owner: Owner;
  createdAt: string;
};

export type ProjectInput = {
  name: string;
  repoUrl: string;
  branch: string;
  buildCommand: string;
  startCommand: string;
  slug?: string;
  installCommand?: string;
  healthPath?: string;
  framework?: string;
};

export type Deployment = {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  createdAt: string;
  finishedAt: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  branch: string;
  triggeredBy: 'manual' | 'rollback' | 'git';
  current: boolean;
};

export type LogLine = {
  id: string;
  timestamp: string | null;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type LogChunk = {
  deploymentId: string;
  status: DeploymentStatus;
  lines: LogLine[];
  nextCursor: string | null;
};

export type DnsRecord = {
  type: DnsRecordType;
  host: string;
  fqdn: string;
  value: string;
  ttl: number;
  purpose: 'routing' | 'redirect' | 'verification';
  /** True when an apex CNAME only works with Cloudflare CNAME flattening. */
  flattening: boolean;
};

export type DomainRoutingOption = {
  id: string;
  type: 'CNAME' | 'NS';
  hostname: string;
  value: string | null;
  note: string;
};

export type Domain = {
  id: string;
  projectId: string;
  hostname: string;
  kind: DomainKind;
  redirect: DomainRedirect;
  status: DomainStatus;
  check: {
    code: DomainCheckCode;
    message: string | null;
    checkedAt: string | null;
  };
  records: DnsRecord[];
  /** Alternative apex routes supplied by the API; choose one, never all. */
  routingOptions?: DomainRoutingOption[];
};

export type DomainInput = {
  hostname: string;
  kind: DomainKind;
  redirect: DomainRedirect;
};

export type EnvVar = {
  id: string;
  key: string;
  environments: EnvName[];
  /** Always masked. The API client has no field for the stored secret. */
  maskedValue: '••••••••';
  updatedAt: string;
};

export type EnvVarInput = {
  key: string;
  value: string;
  environments: EnvName[];
};

export type ApiErrorBody = {
  error: string;
  code?: string;
};

export type Migration = {
  name: string;
  checksum: string;
  appliedAt: string;
  alreadyApplied?: boolean;
};

export type OperationsSnapshot = {
  checks: { code: string; status: 'ok' | 'warning' | 'critical'; message: string; checkedAt: string }[];
  events: { id: string; source: string; severity: 'info' | 'warning' | 'critical'; message: string; createdAt: string }[];
  backups: { id: string; filename: string; sizeBytes: number; createdAt: string }[];
};
