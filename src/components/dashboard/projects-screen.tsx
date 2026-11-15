'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Project } from '@/lib/api/types';
import { chipClass, deploymentStatusLabel, formatWhen, projectStatusLabel } from '@/components/dashboard/format';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    dashboardApi.projects()
      .then(items => { if (!controller.signal.aborted) setProjects(items); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause.message : 'Projecten laden mislukt.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="console-page-heading">
        <div>
          <p className="console-eyebrow">DEFAULTSTACKR / PROJECTEN</p>
          <h1>Je projecten</h1>
          <p>Naam, status, laatste uitrol en domein. Elk project hoort bij een team of gebruiker.</p>
        </div>
        <Link href="/app/projects/new" className="primary">Nieuw project</Link>
      </div>
      {error && <p role="alert" className="db-error">{error}</p>}
      {loading ? <div className="console-empty" role="status">Projecten laden…</div> : projects.length === 0 ? (
        <div className="console-empty">
          <div className="empty-glyph">▦</div>
          <h3>Nog geen projecten</h3>
          <p>Maak het eerste project aan met een repository, branch en build-commando.</p>
          <Link href="/app/projects/new" className="primary">Nieuw project</Link>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
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
              <footer><span>{project.previewHostname}</span><span>Openen ↗</span></footer>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
