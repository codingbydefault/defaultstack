'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { Deployment } from '@/lib/api/types';
import { chipClass, deploymentStatusLabel, formatWhen } from '@/components/dashboard/format';

export function DeploymentsPanel({ projectId, canDeploy = false }: { projectId: string; canDeploy?: boolean }) {
  const [items, setItems] = useState<Deployment[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await dashboardApi.deployments(projectId);
        if (!active) return;
        setItems(next);
        setError('');
      } catch (cause) {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Uitrollen laden mislukt.');
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [projectId]);

  async function redeploy() {
    setBusy('deploy');
    setError('');
    try {
      const deployment = await dashboardApi.deploy(projectId);
      setItems(currentItems => [deployment, ...currentItems.map(item => ({ ...item, current: false }))]);
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
          <h2>Uitrollen</h2>
          <p>Status van elke uitrol. Open Logs voor de uitvoer van één uitrol.</p>
        </div>
        {canDeploy && <button type="button" className="primary" onClick={() => void redeploy()} disabled={busy !== ''}>Opnieuw uitrollen</button>}
      </div>
      {error && <p role="alert" className="db-error">{error}</p>}
      {!canDeploy && <p className="console-callout">Je kunt je project en code al beheren. Deployen voor klantaccounts wordt beschikbaar zodra builds op de server veilig afgescheiden draaien.</p>}
      {items.length === 0 ? <div className="console-empty">{canDeploy ? 'Nog geen uitrol. Gebruik Opnieuw uitrollen om de branch te bouwen.' : 'Nog geen uitrol. Nieuwe uitrollen verschijnen hier.'}</div> : (
        <ul className="deploy-list">
          {items.map(item => (
            <li key={item.id}>
              <div className="deploy-select">
                <span className={`status-chip ${chipClass(item.status)}`}>{deploymentStatusLabel[item.status]}</span>
                <strong>{item.commitMessage || 'Uitrol'}</strong>
                <span>{item.commitSha ? item.commitSha.slice(0, 7) : item.branch} · {formatWhen(item.createdAt)}{item.current ? ' · huidig' : ''}</span>
              </div>
              <Link className="deploy-log-link" href={`/app/projects/${encodeURIComponent(projectId)}?tab=logs&deployment=${encodeURIComponent(item.id)}`}>Bekijk logs ↗</Link>
              {canDeploy && item.status === 'ready' && !item.current && (
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
    </div>
  );
}
