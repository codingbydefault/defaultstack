'use client';

import Link from 'next/link';
import type { Project } from '@/lib/api/types';
import { deploymentStatusLabel } from '@/components/dashboard/format';

const shortcuts = [
  ['code', 'Code', 'Open en bewerk tekstbestanden uit je repository.'],
  ['deployments', 'Deployments', 'Bekijk builds en de huidige uitrol.'],
  ['logs', 'Logs', 'Lees de uitvoer van je builds.'],
  ['analytics', 'Analytics', 'Volg paginaweergaven per project.'],
  ['domains', 'Domeinen', 'Controleer het projectadres en je DNS-records.'],
] as const;

export function OverviewPanel({ project }: { project: Project }) {
  const base = `/app/projects/${encodeURIComponent(project.id)}`;
  return <div className="stack-gap project-overview">
    <section className="project-overview-live"><div><p className="console-eyebrow">PRODUCTIE / OVERZICHT</p><h2>{project.latestDeployment ? deploymentStatusLabel[project.latestDeployment.status] : 'Nog niet uitgerold'}</h2><p>{project.latestDeployment ? 'Laatste uitrol van de gekoppelde branch.' : 'Je project staat klaar voor de eerste build.'}</p></div><a href={`https://${project.previewHostname}`} target="_blank" rel="noopener noreferrer">{project.previewHostname} ↗</a></section>
    <div className="project-overview-meta"><article><span>REPOSITORY</span><strong>{project.repoUrl.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')}</strong><small>{project.branch}</small></article><article><span>LAATSTE BUILD</span><strong>{project.latestDeployment ? deploymentStatusLabel[project.latestDeployment.status] : 'Geen builds'}</strong><small>{project.latestDeployment?.commitMessage || 'Nog geen commit uitgerold'}</small></article><article><span>PROJECTADRES</span><strong>{project.primaryHostname || project.previewHostname}</strong><small>DNS-status bij Domeinen</small></article></div>
    <section><div className="section-title"><h2>Beheer je project</h2></div><div className="project-overview-links">{shortcuts.map(([tab, title, detail]) => <Link key={tab} href={`${base}?tab=${tab}`}><span>{title}</span><p>{detail}</p><b aria-hidden="true">↗</b></Link>)}</div></section>
  </div>;
}
