'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { EnvName, EnvVar } from '@/lib/api/types';
import { envLabel, formatWhen } from '@/components/dashboard/format';

const names: EnvName[] = ['production', 'preview', 'development'];
const empty = { key: '', value: '', environments: ['production'] as EnvName[] };

export function EnvPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<EnvVar[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [nextValue, setNextValue] = useState('');

  useEffect(() => {
    let active = true;
    dashboardApi.envVars(projectId)
      .then(rows => { if (active) setItems(rows); })
      .catch(cause => { if (active) setError(cause instanceof ApiError ? cause.message : 'Variabelen laden mislukt.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  function toggle(name: EnvName) {
    setForm(current => {
      const has = current.environments.includes(name);
      const environments = has ? current.environments.filter(item => item !== name) : [...current.environments, name];
      return { ...current, environments };
    });
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await dashboardApi.createEnv(projectId, form);
      setItems(await dashboardApi.envVars(projectId));
      setForm(empty);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Opslaan mislukt.');
    } finally {
      setBusy(false);
    }
  }

  async function replace(item: EnvVar) {
    if (!nextValue) return;
    setBusy(true);
    setError('');
    try {
      const updated = await dashboardApi.updateEnv(projectId, item.id, { value: nextValue, environments: item.environments });
      setItems(current => current.map(row => row.id === item.id ? updated : row));
      setEditing(null);
      setNextValue('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Bijwerken mislukt.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await dashboardApi.deleteEnv(projectId, id);
      setItems(current => current.filter(item => item.id !== id));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Verwijderen mislukt.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-gap">
      <form className="console-section form-grid" onSubmit={create}>
        <div className="section-title">
          <div>
            <h2>Nieuwe variabele</h2>
            <p>De waarde wordt één keer opgeslagen en daarna alleen als •••• getoond.</p>
          </div>
        </div>
        <label>Sleutel<input required pattern="[A-Z_][A-Z0-9_]*" value={form.key} onChange={event => setForm(current => ({ ...current, key: event.target.value.toUpperCase() }))} spellCheck={false} /></label>
        <fieldset>
          <legend>Omgeving</legend>
          {names.map(name => (
            <label key={name}><input type="checkbox" checked={form.environments.includes(name)} onChange={() => toggle(name)} /> {envLabel[name]}</label>
          ))}
        </fieldset>
        <label>
          Waarde
          <input required type="password" autoComplete="new-password" value={form.value} onChange={event => setForm(current => ({ ...current, value: event.target.value }))} />
        </label>
        <p className="field-hint">Write-only. Na opslaan wist dit veld en toont de lijst geen waarde meer.</p>
        {error && <p role="alert" className="db-error">{error}</p>}
        <button className="primary" type="submit" disabled={busy || form.environments.length === 0}>{busy ? 'Bezig…' : 'Variabele opslaan'}</button>
      </form>
      {loading ? <div className="console-empty" role="status">Variabelen laden…</div> : items.length === 0 ? <div className="console-empty">Nog geen omgevingsvariabelen.</div> : (
        <div className="table-scroll">
          <table className="record-table">
            <caption>Opgeslagen variabelen, waarden gemaskeerd</caption>
            <thead><tr><th>Sleutel</th><th>Omgeving</th><th>Waarde</th><th>Bijgewerkt</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><code>{item.key}</code></td>
                  <td>{item.environments.map(name => envLabel[name]).join(', ')}</td>
                  <td><span className="masked" aria-label="Verborgen waarde">{item.maskedValue}</span></td>
                  <td>{formatWhen(item.updatedAt)}</td>
                  <td>
                    {editing === item.id ? (
                      <div className="confirm-row">
                        <input type="password" aria-label={`Nieuwe waarde voor ${item.key}`} autoComplete="new-password" value={nextValue} onChange={event => setNextValue(event.target.value)} />
                        <button type="button" onClick={() => void replace(item)} disabled={busy || !nextValue}>Opslaan</button>
                        <button type="button" onClick={() => { setEditing(null); setNextValue(''); }}>Annuleren</button>
                      </div>
                    ) : (
                      <div className="confirm-row">
                        <button type="button" onClick={() => { setEditing(item.id); setNextValue(''); }}>Nieuwe waarde</button>
                        <button type="button" onClick={() => void remove(item.id)} disabled={busy}>Verwijderen</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
