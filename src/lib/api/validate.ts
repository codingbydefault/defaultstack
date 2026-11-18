import type { DomainInput, DomainKind, DomainRedirect, EnvName, EnvVarInput, ProjectInput } from '@/lib/api/types';

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PROJECT_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RESERVED_PROJECT_SLUGS = new Set(['api', 'www', 'admin', 'mail', 'smtp', 'ftp', 'ns1', 'ns2', 'tunnel', 'fallback', 'origin', 'customers', 'cdn', 'static', 'web']);

export function projectSlugError(value: string): string | null {
  if (!PROJECT_SLUG.test(value)) return 'Gebruik 1 tot 40 kleine letters, cijfers of koppeltekens; begin en eindig met een letter of cijfer.';
  if (RESERVED_PROJECT_SLUGS.has(value)) return 'Deze projectnaam is gereserveerd voor het platform. Kies een andere.';
  return null;
}

export function normalizeHostname(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/\.$/, '').replace(/^https?:\/\//, '').split('/')[0] ?? '';
  if (!HOSTNAME.test(value) || value.includes('*')) return null;
  return value;
}

export function hostLabels(hostname: string): string[] {
  return hostname.split('.');
}

export function validateProjectInput(input: Partial<ProjectInput>): string | null {
  if (!input.name || input.name.trim().length < 2 || input.name.trim().length > 40) return 'Geef het project een naam van 2 tot 40 tekens.';
  if (!input.repoUrl || !/^https:\/\/[^\s]{1,200}$/.test(input.repoUrl.trim())) return 'Gebruik een https-adres van de repository.';
  if (!input.branch || !/^[A-Za-z0-9._/-]{1,120}$/.test(input.branch.trim()) || input.branch.includes('..')) return 'De branch is ongeldig.';
  if (!input.buildCommand || input.buildCommand.trim().length < 2 || input.buildCommand.length > 200) return 'Vul een build-commando in.';
  if (!input.startCommand || input.startCommand.trim().length < 2 || input.startCommand.length > 200) return 'Vul een start-commando in.';
  return null;
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return RESERVED_PROJECT_SLUGS.has(slug) ? `${slug}-app` : slug || 'app';
}

export function validateDomainInput(input: Partial<DomainInput>): { value: DomainInput; hostname: string } | { error: string } {
  const kind: DomainKind | undefined = input.kind === 'apex' || input.kind === 'subdomain' ? input.kind : undefined;
  const redirect: DomainRedirect | undefined =
    input.redirect === 'none' || input.redirect === 'apex_to_www' || input.redirect === 'www_to_apex' ? input.redirect : undefined;
  const hostname = normalizeHostname(input.hostname ?? '');
  if (!hostname || !kind || !redirect) return { error: 'Vul een geldige hostnaam, soort en doorverwijzing in.' };
  const labels = hostLabels(hostname);
  if (kind === 'subdomain' && labels.length < 3) return { error: 'Een subdomein heeft minstens drie delen, zoals app.voorbeeld.nl.' };
  if (kind === 'apex' && labels.length < 2) return { error: 'Een apex-domein ziet eruit als voorbeeld.nl.' };
  if (kind === 'subdomain' && redirect !== 'none') return { error: 'Een doorverwijzing tussen apex en www hoort bij het apex-domein.' };
  return { value: { hostname, kind, redirect }, hostname };
}

const ENV_KEY = /^[A-Z_][A-Z0-9_]{0,127}$/;
const ENV_NAMES: EnvName[] = ['production', 'preview', 'development'];

export function validateEnvInput(input: Partial<EnvVarInput>, requireValue: boolean): string | null {
  if (!input.key || !ENV_KEY.test(input.key)) return 'De sleutel gebruikt hoofdletters, cijfers en underscores.';
  if (!Array.isArray(input.environments) || input.environments.length === 0 || input.environments.some(item => !ENV_NAMES.includes(item))) {
    return 'Kies Production, Preview of Development.';
  }
  if (requireValue && (typeof input.value !== 'string' || input.value.length < 1 || input.value.length > 5000)) {
    return 'Vul een waarde in. Die wordt daarna niet meer getoond.';
  }
  if (!requireValue && input.value !== undefined && (typeof input.value !== 'string' || input.value.length < 1 || input.value.length > 5000)) {
    return 'De nieuwe waarde is ongeldig.';
  }
  return null;
}

export function previewHostname(slug: string): string {
  return `${slug}.defaultstackr.cloud`;
}
