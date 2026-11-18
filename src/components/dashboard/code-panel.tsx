'use client';

import { useEffect, useState } from 'react';
import { GitHubPanel } from '@/components/dashboard/github-panel';

type FileItem = { path: string; size: number };
type Tree = { files?: FileItem[]; branch?: string; truncated?: boolean; error?: string };
type File = { path?: string; content?: string; sha?: string; error?: string };

export function CodePanel({ projectId, repoUrl }: { projectId: string; repoUrl: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState('');
  const [content, setContent] = useState('');
  const [sha, setSha] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('laden');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [truncated, setTruncated] = useState(false);
  const changed = selected !== '' && content !== saved;

  useEffect(() => {
    let active = true;
    async function load() {
      setBusy('laden');
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/source`, { cache: 'no-store' });
        const data = await response.json() as Tree;
        if (!response.ok) throw new Error(data.error || 'Bestanden laden mislukt.');
        if (active) { setFiles(data.files || []); setTruncated(data.truncated === true); setError(''); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Bestanden laden mislukt.'); }
      finally { if (active) setBusy(''); }
    }
    void load();
    return () => { active = false; };
  }, [projectId]);

  async function open(path: string) {
    if (changed && !window.confirm('Je hebt niet-opgeslagen wijzigingen. Toch een ander bestand openen?')) return;
    setBusy('openen'); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/source?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
      const data = await response.json() as File;
      if (!response.ok || typeof data.content !== 'string' || typeof data.sha !== 'string') throw new Error(data.error || 'Bestand openen mislukt.');
      setSelected(path); setContent(data.content); setSaved(data.content); setSha(data.sha);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bestand openen mislukt.'); }
    finally { setBusy(''); }
  }

  async function save() {
    if (!selected || !changed || busy) return;
    setBusy('opslaan'); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/source?path=${encodeURIComponent(selected)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, sha }),
      });
      const data = await response.json() as { sha?: string; commitSha?: string; error?: string };
      if (!response.ok || typeof data.sha !== 'string') throw new Error(data.error || 'Opslaan mislukt.');
      setSha(data.sha); setSaved(content); setNotice(`Opgeslagen op GitHub${data.commitSha ? ` · commit ${data.commitSha.slice(0, 7)}` : ''}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Opslaan mislukt.'); }
    finally { setBusy(''); }
  }

  function insertIndent(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const node = event.currentTarget;
    const start = node.selectionStart;
    const end = node.selectionEnd;
    setContent(value => `${value.slice(0, start)}  ${value.slice(end)}`);
    requestAnimationFrame(() => { node.selectionStart = node.selectionEnd = start + 2; });
  }

  const shown = files.filter(file => file.path.toLocaleLowerCase('nl-NL').includes(search.toLocaleLowerCase('nl-NL')));
  return <div className="stack-gap">
    <div className="section-title"><div><h2>Code</h2><p>Open een tekstbestand, pas het aan en bewaar de wijziging als commit op GitHub.</p></div><a href={repoUrl.replace(/\.git$/, '')} target="_blank" rel="noopener noreferrer" className="outline">Open GitHub ↗</a></div>
    <GitHubPanel />
    {error && <p role="alert" className="db-error">{error}</p>}
    {notice && <p role="status" className="console-callout">{notice}</p>}
    <div className="code-workspace">
      <aside className="code-files" aria-label="Projectbestanden"><div className="code-files-heading"><strong>Bestanden</strong><span>{files.length}</span></div><input type="search" aria-label="Zoek bestanden" placeholder="Zoek bestand…" value={search} onChange={event => setSearch(event.target.value)} />
        {busy === 'laden' ? <p role="status">Bestanden laden…</p> : <div className="code-file-list">{shown.map(file => <button type="button" key={file.path} className={selected === file.path ? 'active' : ''} onClick={() => void open(file.path)} disabled={busy !== ''} title={file.path}>▤ <span>{file.path}</span></button>)}</div>}
        {truncated && <p className="field-hint">De lijst is beperkt tot de eerste 1000 tekstbestanden.</p>}
      </aside>
      <section className="code-editor" aria-label="Code-editor"><div className="code-editor-bar"><strong>{selected || 'Kies een bestand'}</strong>{selected && <span>{changed ? 'Niet opgeslagen' : 'Opgeslagen'}</span>}</div>
        {selected ? <><textarea aria-label={`Bewerk ${selected}`} spellCheck={false} value={content} onChange={event => setContent(event.target.value)} onKeyDown={insertIndent} /><div className="code-editor-actions"><span>Opslaan maakt een commit op de gekoppelde branch.</span><button type="button" className="primary" onClick={() => void save()} disabled={!changed || busy !== ''}>{busy === 'opslaan' ? 'Opslaan…' : 'Commit opslaan'}</button></div></>
          : <div className="code-empty">{files.length ? 'Kies links een bestand om te beginnen.' : 'Koppel GitHub en geef de GitHub App toegang tot deze repository.'}</div>}
      </section>
    </div>
  </div>;
}
