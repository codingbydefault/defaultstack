'use client';

import { FormEvent, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Project, ProjectInput } from '@/lib/api/types';

export function SettingsPanel({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  const [form, setForm] = useState<ProjectInput>({
    name: project.name,
    repoUrl: project.repoUrl,
    branch: project.branch,
    buildCommand: project.buildCommand,
    startCommand: project.startCommand,
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function set<K extends keyof ProjectInput>(key: K, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      onChange(await dashboardApi.updateProject(project.id, form));
      setNotice('Instellingen opgeslagen.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Opslaan mislukt.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await dashboardApi.deleteProject(project.id);
      window.location.assign('/app');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Verwijderen mislukt.');
      setBusy(false);
    }
  }

  return (
    <div className="stack-gap">
      <form className="console-section form-grid" onSubmit={save}>
        <label>Naam<input required minLength={2} maxLength={40} value={form.name} onChange={event => set('name', event.target.value)} /></label>
        <label>Repository-URL<input required type="url" value={form.repoUrl} onChange={event => set('repoUrl', event.target.value)} /></label>
        <label>Branch<input required value={form.branch} onChange={event => set('branch', event.target.value)} /></label>
        <label>Build-commando<input required value={form.buildCommand} onChange={event => set('buildCommand', event.target.value)} /></label>
        <label>Start-commando<input required value={form.startCommand} onChange={event => set('startCommand', event.target.value)} /></label>
        <p className="field-hint">Eigenaar: {project.owner.kind === 'team' ? 'Team' : 'Gebruiker'} {project.owner.name}. Preview: {project.previewHostname}. De eigenaar wijzigt niet vanuit dit scherm.</p>
        {error && <p role="alert" className="db-error">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
      </form>
      <section className="console-section danger-zone">
        <h2>Project verwijderen</h2>
        <p>Het project, de uitrollen, de domeinkoppeling en de variabelen verdwijnen uit deze console. Een vrijgegeven domein kan daarna door een ander project worden geclaimd.</p>
        {confirming ? (
          <div className="confirm-row">
            <button type="button" onClick={() => void remove()} disabled={busy}>{busy ? 'Bezig…' : 'Ja, verwijder dit project'}</button>
            <button type="button" onClick={() => setConfirming(false)}>Annuleren</button>
          </div>
        ) : <button type="button" onClick={() => setConfirming(true)}>Project verwijderen</button>}
      </section>
    </div>
  );
}
