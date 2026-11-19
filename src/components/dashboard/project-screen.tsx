'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Project } from '@/lib/api/types';
import { DeploymentsPanel } from '@/components/dashboard/deployments-panel';
import { ProjectLogsPanel } from '@/components/dashboard/project-logs-panel';
import { DomainsPanel } from '@/components/dashboard/domains-panel';
import { EnvPanel } from '@/components/dashboard/env-panel';
import { chipClass, projectStatusLabel } from '@/components/dashboard/format';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import { MigrationsPanel } from '@/components/dashboard/migrations-panel';
import { CodePanel } from '@/components/dashboard/code-panel';
import { AnalyticsPanel } from '@/components/dashboard/analytics-panel';
import { OverviewPanel } from '@/components/dashboard/overview-panel';

const tabs = [
  ['overview', 'Overzicht'],
  ['deployments', 'Uitrollen'],
  ['code', 'Code'],
  ['logs', 'Logs'],
  ['analytics', 'Analytics'],
  ['domains', 'DNS-instellingen'],
  ['env', 'Omgevingsvariabelen'],
  ['migrations', 'SQL-migraties'],
  ['settings', 'Instellingen'],
] as const;

export type ProjectTab = (typeof tabs)[number][0];

export function ProjectScreen({ projectId, tab }: { projectId: string; tab: ProjectTab }) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    dashboardApi.project(projectId)
      .then(item => { if (active) setProject(item); })
      .catch(cause => { if (active) setError(cause instanceof ApiError ? cause.message : 'Project laden mislukt.'); });
    return () => { active = false; };
  }, [projectId]);

  if (error) return <p role="alert" className="db-error">{error}</p>;
  if (!project) return <div className="console-empty" role="status">Project laden…</div>;

  return (
    <>
      <div className="console-page-heading">
        <div>
          <p className="console-eyebrow">{project.owner.kind === 'team' ? 'TEAM' : 'GEBRUIKER'} / {project.owner.name}</p>
          <h1>{project.name}</h1>
          <p>{project.repoUrl} · {project.branch}</p>
        </div>
        <span className={`status-chip ${chipClass(project.status)}`}>{projectStatusLabel[project.status]}</span>
      </div>
      <div className="dash-tabs" role="tablist" aria-label="Project">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/app/projects/${project.id}?tab=${id}`} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''}>
            {label}
          </Link>
        ))}
      </div>
      {tab === 'overview' && <OverviewPanel project={project} />}
      {tab === 'deployments' && <DeploymentsPanel projectId={project.id} canDeploy={project.owner.kind === 'team'} />}
      {tab === 'code' && <CodePanel projectId={project.id} repoUrl={project.repoUrl} />}
      {tab === 'logs' && <ProjectLogsPanel projectId={project.id} />}
      {tab === 'analytics' && <AnalyticsPanel projectId={project.id} />}
      {tab === 'domains' && <DomainsPanel projectId={project.id} previewHost={project.previewHostname} />}
      {tab === 'env' && <EnvPanel projectId={project.id} />}
      {tab === 'migrations' && <MigrationsPanel projectId={project.id} />}
      {tab === 'settings' && <SettingsPanel project={project} onChange={setProject} />}
    </>
  );
}
