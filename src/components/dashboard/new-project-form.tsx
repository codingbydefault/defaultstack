'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';

const initial = { name: '', repoUrl: '', branch: 'main', buildCommand: 'npm run build', startCommand: 'npm start' };

export function NewProjectForm() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof initial>(key: K, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const project = await dashboardApi.createProject(form);
      window.location.assign(`/app/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Project aanmaken mislukt.');
      setBusy(false);
    }
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
      <form className="console-section form-grid" onSubmit={submit}>
        <label>Naam<input required minLength={2} maxLength={40} value={form.name} onChange={event => set('name', event.target.value)} /></label>
        <label>Repository-URL<input required type="url" inputMode="url" placeholder="https://github.com/team/app" value={form.repoUrl} onChange={event => set('repoUrl', event.target.value)} /></label>
        <label>Branch<input required value={form.branch} onChange={event => set('branch', event.target.value)} /></label>
        <label>Build-commando<input required value={form.buildCommand} onChange={event => set('buildCommand', event.target.value)} /></label>
        <label>Start-commando<input required value={form.startCommand} onChange={event => set('startCommand', event.target.value)} /></label>
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
