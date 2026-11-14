'use client';

import { FormEvent, useEffect, useState } from 'react';
type Row = { id: number; name: string; email?: string; price?: string | number };
type Table = 'users' | 'products';

export default function DatabaseEditor() {
  const [table, setTable] = useState<Table>('users');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<{ id?: number; name: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRows([]);
    fetch(`/api/data/${table}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load records');
      if (!Array.isArray(data)) throw new Error('API returned an unexpected response');
      setRows(data);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [table, refresh]);
  async function mutate(method: string, body?: object, id?: number) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/data/${table}${id === undefined ? '' : `/${id}`}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');
      setEditor(null); setDeleting(null); setNotice('Changes saved'); setRefresh(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed'); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const value = table === 'users' ? { email: editor.value.trim() } : { price: Number(editor.value) };
    void mutate(editor.id === undefined ? 'POST' : 'PATCH', { name: editor.name.trim(), ...value }, editor.id);
  }
  const filtered = rows.filter(row => `${row.id} ${row.name} ${row.email ?? row.price}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="database-workspace">
      <div className="table-tabs" role="group" aria-label="Database tables">{(['users', 'products'] as Table[]).map(name => <button key={name} disabled={busy} aria-pressed={table === name} className={table === name ? 'selected' : ''} onClick={() => { setTable(name); setEditor(null); setDeleting(null); setSearch(''); setNotice(''); }}>{name}</button>)}</div>
      <div className="db-heading"><div><p className="db-caption">POSTGRESQL · TABLE EDITOR</p><h1>{table}</h1><p className="db-muted">Manage the records in your own database.</p></div><button className="primary" disabled={loading || !!error || busy} onClick={() => { setEditor({ name: '', value: '' }); setNotice(''); }}>+ Insert row</button></div>
      <p className="db-warning">Private network only. Account authentication and project permissions are not implemented yet.</p>
      {error && <div role="alert" className="db-error">{error}</div>}{notice && <p role="status">{notice}</p>}
      <div className="db-toolbar"><input aria-label="Search loaded records" placeholder="Search loaded records…" value={search} onChange={e => setSearch(e.target.value)} /><button disabled={busy || loading} onClick={() => setRefresh(v => v + 1)}>Refresh</button></div>
      <div className="db-table"><table><thead><tr><th>id</th><th>name</th><th>{table === 'users' ? 'email' : 'price'}</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading records…</td></tr> : filtered.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.name}</td><td>{table === 'users' ? row.email : row.price}</td><td><button disabled={busy} onClick={() => { setEditor({ id: row.id, name: row.name, value: String(table === 'users' ? row.email ?? '' : row.price ?? '') }); setDeleting(null); }}>Edit</button> <button disabled={busy} onClick={() => { setDeleting(row); setEditor(null); }}>Delete</button></td></tr>)}{!loading && !error && !filtered.length && <tr><td colSpan={4}>{search ? 'No matching records.' : 'No records yet. Insert your first row.'}</td></tr>}</tbody></table></div><p className="db-muted">{loading ? 'Loading' : `${filtered.length} of ${rows.length} loaded records`} · {table === 'users' ? 'name, email' : 'name, price'} editable</p>
      {editor && <form className="db-panel" onSubmit={save}><h2>{editor.id === undefined ? 'Insert row' : `Edit row ${editor.id}`}</h2><label>Name<input required maxLength={200} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></label><label>{table === 'users' ? 'Email' : 'Price'}<input required type={table === 'users' ? 'email' : 'number'} min={table === 'products' ? '0' : undefined} step={table === 'products' ? '0.01' : undefined} value={editor.value} onChange={e => setEditor({ ...editor, value: e.target.value })} /></label><div><button className="primary" disabled={busy || !editor.name.trim()}>{busy ? 'Saving…' : 'Save row'}</button> <button type="button" disabled={busy} onClick={() => setEditor(null)}>Cancel</button></div></form>}
      {deleting && <section className="db-panel" aria-label="Confirm deletion"><h2>Delete row {deleting.id}?</h2><p>This permanently deletes {deleting.name} from {table}.</p><button disabled={busy} onClick={() => void mutate('DELETE', undefined, deleting.id)}>{busy ? 'Deleting…' : 'Confirm delete'}</button> <button disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></section>}
    </section>;
}
