'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import { projectSlugError, slugify } from '@/lib/api/validate';
import { GitHubPanel, type GitHubRepo } from '@/components/dashboard/github-panel';

const initial = { name: '', slug: '', repoUrl: '', branch: 'main', installCommand: 'npm ci', buildCommand: 'npm run build', startCommand: 'npm start', healthPath: '/', framework: 'next' };

export function NewProjectForm() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  function set<K extends keyof typeof initial>(key: K, value: string) {
    setForm(current => key === 'name' && (!slugEdited || Boolean(projectSlugError(current.slug)))
      ? { ...current, name: value, slug: slugify(value) }
      : { ...current, [key]: value });
  }

  function resetSlug() {
    setForm(current => ({ ...current, slug: slugify(current.name) }));
    setSlugEdited(false);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const slugError = projectSlugError(form.slug);
    if (slugError) { setError(slugError); return; }
    setBusy(true);
    setError('');
    try {
      const project = await dashboardApi.createProject(form);
      window.location.assign(`/app/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.message === 'Invalid slug'
        ? projectSlugError(form.slug) || 'Deze projectnaam kan niet worden gebruikt. Kies een andere.'
        : cause instanceof ApiError ? cause.message : 'Project aanmaken mislukt.');
      setBusy(false);
    }
  }

  function selectRepo(repo: GitHubRepo) {
    const projectName = repo.fullName.split('/').at(-1) || repo.fullName;
    setForm(current => ({ ...current, name: projectName, slug: slugify(projectName),
      repoUrl: repo.cloneUrl, branch: repo.defaultBranch }));
    setSlugEdited(false);
    setError('');
  }

  return (
    <>
      <div className="console-page-heading">
        <div>
          <p className="console-eyebrow">NIEUW PROJECT</p>
          <h1>Geef je app een plek</h1>
          <p>Repository, branch en de commando’s waarmee DefaultStackr bouwt en start.</p>
        </div>
      </div>
      <GitHubPanel onSelect={selectRepo} />
      <form className="console-section form-grid" onSubmit={submit}>
        <label>Naam<input required minLength={2} maxLength={40} value={form.name} onChange={event => set('name', event.target.value)} /></label>
        <div className="project-slug-field">
          <label>Projectadres (alleen de naam)<input required pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?" maxLength={40} placeholder="plainwork" value={form.slug} onChange={event => { setSlugEdited(true); set('slug', event.target.value.trim().toLowerCase()); }} /></label>
          <p className="field-hint">{form.slug || 'jouw-project'}.defaultstackr.cloud · Plak de GitHub-link hieronder bij Repository-URL.</p>
          {slugEdited && <button className="slug-reset" type="button" onClick={resetSlug}>Gebruik de naam als projectadres</button>}
        </div>
        <label>Repository-URL<input required type="url" inputMode="url" placeholder="https://github.com/team/app" value={form.repoUrl} onChange={event => set('repoUrl', event.target.value)} /></label>
        <label>Branch<input required value={form.branch} onChange={event => set('branch', event.target.value)} /></label>
        <label>Installatiecommando<input required value={form.installCommand} onChange={event => set('installCommand', event.target.value)} /></label>
        <label>Build-commando<input required value={form.buildCommand} onChange={event => set('buildCommand', event.target.value)} /></label>
        <label>Start-commando<input required value={form.startCommand} onChange={event => set('startCommand', event.target.value)} /></label>
        <label>Healthcheck-pad<input required value={form.healthPath} onChange={event => set('healthPath', event.target.value)} /></label>
        <p className="field-hint">Het project komt bij het team van deze beheer-API. Het preview-adres wordt <code>&lt;slug&gt;.defaultstackr.cloud</code>.</p>
        {error && <p role="alert" className="db-error">{error}</p>}
        <div className="form-actions">
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Project aanmaken'}</button>
          <Link href="/app">Annuleren</Link>
        </div>
      </form>
    </>
  );
}
