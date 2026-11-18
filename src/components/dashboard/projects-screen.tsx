'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Project } from '@/lib/api/types';
import { chipClass, deploymentStatusLabel, formatWhen, projectStatusLabel } from '@/components/dashboard/format';
import { GitHubPanel } from '@/components/dashboard/github-panel';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'building'>('all');

  useEffect(() => {
    const controller = new AbortController();
    dashboardApi.projects()
      .then(items => { if (!controller.signal.aborted) setProjects(items); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause.message : 'Projecten laden mislukt.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const liveCount = projects.filter(project => project.status === 'ready').length;
  const buildingCount = projects.filter(project => project.status === 'building').length;
  const visibleProjects = projects.filter(project => {
    const matchesFilter = filter === 'all' || project.status === filter;
    const query = search.trim().toLocaleLowerCase('nl-NL');
    return matchesFilter && (!query || [project.name, project.repoUrl, project.previewHostname, project.owner.name]
      .some(value => value.toLocaleLowerCase('nl-NL').includes(query)));
  });

  return (
    <>
      <section className="console-hero" aria-labelledby="console-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-beam" aria-hidden="true" />
        <div>
          <h1 id="console-title">Alles wat je bouwt.<br />Op één plek.</h1>
          <p>Beheer je projecten, uitrollen en databases vanuit je eigen cloud.</p>
          <Link href="/app/projects/new" className="primary hero-action">Nieuw project <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-visual" aria-hidden="true"><span className="visual-ring ring-one" /><span className="visual-ring ring-two" /><span className="visual-core"><i /><i /><i /></span><span className="visual-orbit orbit-one" /><span className="visual-orbit orbit-two" /></div>
      </section>
      <div className="workspace-stats" aria-label="Projectstatus">
        <div><span>TOTAAL PROJECTEN</span><strong>{loading ? '–' : projects.length.toString().padStart(2, '0')}</strong><small>In deze werkruimte</small></div>
        <div><span>LIVE PROJECTEN</span><strong>{loading ? '–' : liveCount.toString().padStart(2, '0')}</strong><small>Laatste uitrol actief</small></div>
        <div><span>IN UITROL</span><strong>{loading ? '–' : buildingCount.toString().padStart(2, '0')}</strong><small>Wordt nu gebouwd</small></div>
      </div>
      <GitHubPanel />
      <div className="projects-toolbar">
        <div><h2>Projecten <span>{projects.length}</span></h2></div>
        <div className="projects-controls">
          <label className="projects-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Zoek projecten" placeholder="Zoek op naam, repository of domein" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className="projects-filters" role="group" aria-label="Filter projecten">
            {([['all', 'Alles'], ['ready', 'Live'], ['building', 'In uitrol']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
        </div>
      </div>
      {error && <p role="alert" className="db-error">{error}</p>}
      {loading ? <div className="console-empty" role="status">Projecten laden…</div> : projects.length === 0 ? (
        <div className="console-empty">
          <div className="empty-glyph">▦</div>
          <h3>Nog geen projecten</h3>
          <p>Maak het eerste project aan met een repository, branch en build-commando.</p>
          <Link href="/app/projects/new" className="primary">Nieuw project</Link>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="console-empty"><h3>Geen projecten gevonden</h3><p>Pas je zoekopdracht of filter aan.</p></div>
      ) : (
        <div className="project-grid">
          {visibleProjects.map(project => (
            <Link className="project-card" key={project.id} href={`/app/projects/${project.id}`}>
              <div>
                <span className="project-avatar">{project.name.slice(0, 1).toUpperCase()}</span>
                <span className={`status-chip ${chipClass(project.status)}`}>{projectStatusLabel[project.status]}</span>
              </div>
              <h3>{project.name}</h3>
              <p>{project.owner.kind === 'team' ? 'Team' : 'Gebruiker'} · {project.owner.name}</p>
              <dl className="card-facts">
                <div><dt>Laatste uitrol</dt><dd>{project.latestDeployment ? `${deploymentStatusLabel[project.latestDeployment.status]} · ${formatWhen(project.latestDeployment.createdAt)}` : 'Nog geen uitrol'}</dd></div>
                <div><dt>Domein</dt><dd>{project.primaryHostname ?? project.previewHostname}</dd></div>
              </dl>
              <footer><span>{project.previewHostname}</span><span>Open project <b aria-hidden="true">↗</b></span></footer>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
