'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/client';
import type { Migration } from '@/lib/api/types';

export function MigrationsPanel({ projectId }: { projectId: string }) {
  const [configured, setConfigured] = useState(false);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [name, setName] = useState('');
  const [sql, setSql] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const status = await dashboardApi.projectDatabase(projectId);
    setConfigured(status.configured);
    setMigrations(status.configured ? await dashboardApi.migrations(projectId) : []);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    refresh().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Migraties laden mislukt.'); });
    return () => { active = false; };
  }, [refresh]);

  async function apply(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await dashboardApi.applyMigration(projectId, { name, sql });
      setNotice(result.alreadyApplied ? 'Deze migratie was al toegepast.' : `${result.name} is toegepast.`);
      if (!result.alreadyApplied) { setName(''); setSql(''); }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Migratie mislukt.');
    } finally { setBusy(false); }
  }

  return <section className="console-section">
    <div className="section-title"><div><h2>SQL-migraties</h2><p>Schemawijzigingen voor de aparte database van dit project.</p></div></div>
    {error && <p className="db-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!configured ? <p className="console-callout">Deze projectdatabase is nog niet verbonden. Laat de beheerder eerst een aparte database en migratiegebruiker instellen.</p> : <>
      <form className="migration-form" onSubmit={apply}>
        <label>Bestandsnaam<input required pattern="[0-9]{4,8}_[a-z0-9_]+\.sql" placeholder="0001_create_tables.sql" value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
        <label>SQL<textarea required rows={12} maxLength={65536} spellCheck={false} placeholder="CREATE TABLE ...;" value={sql} onChange={event => setSql(event.target.value)} disabled={busy} /></label>
        <button className="primary" disabled={busy || !name || !sql.trim()}>{busy ? 'Bezig…' : 'Migratie uitvoeren'}</button>
      </form>
      <h3>Toegepast</h3>
      {migrations.length ? <div className="migration-history">{migrations.map(item => <div className="migration-row" key={item.name}><span className="file-icon">SQL</span><div><strong>{item.name}</strong><p>{new Date(item.appliedAt).toLocaleString('nl-NL')}</p></div><span>{item.checksum.slice(0, 12)}</span></div>)}</div> : <p className="console-callout">Nog geen migraties toegepast.</p>}
    </>}
  </section>;
}
