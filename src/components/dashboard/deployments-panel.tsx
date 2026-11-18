'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Deployment, LogLine } from '@/lib/api/types';
import { chipClass, deploymentStatusLabel, formatWhen } from '@/components/dashboard/format';

export function DeploymentsPanel({ projectId, logsOnly = false, canDeploy = true }: { projectId: string; logsOnly?: boolean; canDeploy?: boolean }) {
  const [items, setItems] = useState<Deployment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await dashboardApi.deployments(projectId);
        if (!active) return;
        setItems(next);
        setError('');
        setSelected(current => current ?? next.find(item => item.current)?.id ?? next[0]?.id ?? null);
      } catch (cause) {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Uitrollen laden mislukt.');
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId]);

  const current = items.find(item => item.id === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    const deploymentId = selected;
    const activeStatus = items.find(item => item.id === selected)?.status;
    if (!activeStatus) return;
    let active = true;
    async function loadLogs() {
      try {
        const chunk = await dashboardApi.logs(projectId, deploymentId);
        if (!active) return;
        setLines(chunk.lines);
      } catch (cause) {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Logboek laden mislukt.');
      }
    }
    void loadLogs();
    const delay = activeStatus === 'building' || activeStatus === 'queued' ? 2000 : 10000;
    const timer = window.setInterval(() => void loadLogs(), delay);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId, selected, items]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines]);

  async function redeploy() {
    setBusy('deploy');
    setError('');
    try {
      const deployment = await dashboardApi.deploy(projectId);
      setItems(currentItems => [deployment, ...currentItems.map(item => ({ ...item, current: false }))]);
      setSelected(deployment.id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Opnieuw uitrollen mislukt.');
    } finally {
      setBusy('');
    }
  }

  async function rollback(id: string) {
    setBusy(id);
    setError('');
    try {
      await dashboardApi.rollback(projectId, id);
      const next = await dashboardApi.deployments(projectId);
      setItems(next);
      setSelected(id);
      setConfirming(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Terugdraaien mislukt.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack-gap">
      <div className="section-title">
        <div>
          <h2>{logsOnly ? 'Logs' : 'Uitrollen'}</h2>
          <p>{logsOnly ? 'Bekijk de buildlogs van je uitrollen.' : 'Status, logboek en een eerdere geslaagde uitrol terugzetten.'}</p>
        </div>
        {!logsOnly && canDeploy && <button type="button" className="primary" onClick={() => void redeploy()} disabled={busy !== ''}>Opnieuw uitrollen</button>}
      </div>
      {error && <p role="alert" className="db-error">{error}</p>}
      {!logsOnly && !canDeploy && <p className="console-callout">Je kunt je project en code al beheren. Deployen voor klantaccounts wordt beschikbaar zodra builds op de server veilig afgescheiden draaien.</p>}
      {items.length === 0 ? <div className="console-empty">Nog geen uitrol. Gebruik Opnieuw uitrollen om de branch te bouwen.</div> : (
        <ul className="deploy-list">
          {items.map(item => (
            <li key={item.id} className={item.id === selected ? 'selected' : ''}>
              <button type="button" className="deploy-select" onClick={() => setSelected(item.id)} aria-pressed={item.id === selected}>
                <span className={`status-chip ${chipClass(item.status)}`}>{deploymentStatusLabel[item.status]}</span>
                <strong>{item.commitMessage || 'Uitrol'}</strong>
                <span>{item.commitSha ? item.commitSha.slice(0, 7) : item.branch} · {formatWhen(item.createdAt)}{item.current ? ' · huidig' : ''}</span>
              </button>
              {!logsOnly && canDeploy && item.status === 'ready' && !item.current && (
                confirming === item.id ? (
                  <div className="confirm-row">
                    <span>Deze uitrol terugzetten?</span>
                    <button type="button" onClick={() => void rollback(item.id)} disabled={busy === item.id}>{busy === item.id ? 'Bezig…' : 'Ja, terugdraaien'}</button>
                    <button type="button" onClick={() => setConfirming(null)}>Annuleren</button>
                  </div>
                ) : <button type="button" onClick={() => setConfirming(item.id)}>Terugdraaien</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {current && (
        <section className="console-section" aria-label="Logboek">
          <div className="section-title">
            <h2>Logboek {current.status === 'building' || current.status === 'queued' ? '· live' : ''}</h2>
            <span className={`status-chip ${chipClass(current.status)}`}>{deploymentStatusLabel[current.status]}</span>
          </div>
          <pre ref={logRef} className="log-view" aria-live="polite">
            {lines.length === 0 ? 'Nog geen regels.' : lines.map(line => `${formatWhen(line.timestamp)}  ${line.level === 'error' ? 'fout' : line.level === 'warn' ? 'waarschuwing' : 'info'}  ${line.message}`).join('\n')}
          </pre>
        </section>
      )}
    </div>
  );
}
