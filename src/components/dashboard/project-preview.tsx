'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/api/types';
import { projectPreviewUrl } from '@/lib/projects/preview.mjs';

export function ExternalLinkIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6m-1-5L10 14"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg>;
}

function PreviewFrame({ url, name }: {url: string; name: string}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState<'loading'|'loaded'|'unavailable'>('loading');
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (phase !== 'loading') return;
    const timeout = window.setTimeout(() => setPhase('unavailable'), 15000);
    return () => window.clearTimeout(timeout);
  }, [phase]);
  return <div className="project-preview-viewport" ref={viewport}>
    {width > 0 && <iframe src={url} title={`Voorbeeld van ${name}`} tabIndex={-1} aria-hidden="true" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" style={{transform:`scale(${width / 1280})`}} onLoad={() => setPhase('loaded')} onError={() => setPhase('unavailable')} />}
    {phase !== 'loaded' && <div className="project-preview-state" role="status"><p>{phase === 'loading' ? 'Voorbeeld laden…' : 'Het voorbeeld is niet beschikbaar. Je kunt de uitrol in een nieuw tabblad openen.'}</p></div>}
  </div>;
}

export function ProjectPreview({ project }: {project: Project}) {
  const url = projectPreviewUrl(project);
  const [version, setVersion] = useState(0);
  return <section className="project-live-preview" aria-labelledby="project-preview-heading">
    <div className="project-preview-heading"><div><h2 id="project-preview-heading">Voorbeeld van je uitrol</h2><p>De laatst gepubliceerde versie van je website.</p></div>{url && <div className="project-preview-actions"><button type="button" className="outline" onClick={() => setVersion(value => value+1)}>Vernieuwen</button><a className="primary" href={url} target="_blank" rel="noopener noreferrer">Open uitrol <ExternalLinkIcon/></a></div>}</div>
    {url ? <><div className="project-preview-window"><div className="project-preview-address"><span aria-hidden="true"><i/><i/><i/></span><span>{project.previewHostname}</span></div><PreviewFrame key={`${url}:${version}`} url={url} name={project.name}/></div><p className="project-preview-hint">Website niet zichtbaar? Open de uitrol in een nieuw tabblad.</p></> : <p className="console-empty">Het voorbeeld verschijnt zodra je eerste uitrol is geslaagd.</p>}
  </section>;
}
