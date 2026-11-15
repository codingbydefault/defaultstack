import type { DeploymentStatus, DomainCheckCode, DomainRedirect, DomainStatus, EnvName, ProjectStatus } from '@/lib/api/types';

export function formatWhen(iso: string | null): string {
  if (!iso) return 'Nog niet gecontroleerd';
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export const projectStatusLabel: Record<ProjectStatus, string> = {
  idle: 'Inactief',
  building: 'Bezig',
  ready: 'Live',
  failed: 'Mislukt',
};

export const deploymentStatusLabel: Record<DeploymentStatus, string> = {
  queued: 'In wachtrij',
  building: 'Bezig',
  ready: 'Geslaagd',
  failed: 'Mislukt',
  canceled: 'Geannuleerd',
};

export const domainStatusLabel: Record<DomainStatus, string> = {
  pending_verification: 'Verificatie in afwachting',
  verified: 'Geverifieerd',
  ssl_active: 'SSL actief',
  live: 'Live',
};

export const redirectLabel: Record<DomainRedirect, string> = {
  none: 'Geen doorverwijzing',
  apex_to_www: 'Apex naar www',
  www_to_apex: 'www naar apex',
};

export const envLabel: Record<EnvName, string> = {
  production: 'Productie',
  preview: 'Preview',
  development: 'Development',
};

export function chipClass(status: ProjectStatus | DeploymentStatus | DomainStatus, check?: DomainCheckCode): string {
  if (check && check !== 'ok') return 'bad';
  if (status === 'ready' || status === 'live') return 'good';
  if (status === 'verified' || status === 'ssl_active') return 'good';
  if (status === 'building' || status === 'queued' || status === 'pending_verification') return 'busy';
  if (status === 'failed' || status === 'canceled') return 'bad';
  return 'wait';
}
