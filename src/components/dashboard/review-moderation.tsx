'use client';

import { useEffect, useState } from 'react';

type Review = { id: number; display_name: string; email: string; rating: number; body: string; created_at: string };

export function ReviewModeration() {
  const [items, setItems] = useState<Review[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    void fetch('/api/reviews/moderate', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reviews laden mislukt.');
      setItems(data.reviews || []);
    }).catch(cause => setError(cause instanceof Error ? cause.message : 'Reviews laden mislukt.'));
  }, []);

  async function moderate(id: number, action: 'approve' | 'reject') {
    setBusy(id); setError('');
    try {
      const response = await fetch('/api/reviews/moderate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      if (!response.ok) throw new Error('Beoordeling opslaan mislukt.');
      setItems(current => current.filter(item => item.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Beoordeling opslaan mislukt.'); }
    finally { setBusy(null); }
  }

  return <section className="review-moderation"><div className="section-title"><div><h2>Reviews beoordelen</h2><p>Alleen goedgekeurde reviews verschijnen op de landingspagina.</p></div><span>{items.length} wachtend</span></div>
    {error && <p role="alert" className="db-error">{error}</p>}
    {items.length === 0 && !error ? <p className="console-callout">Er wachten geen reviews op beoordeling.</p> : items.map(item => <article key={item.id}><div><strong>{item.display_name}</strong><span>{item.rating} ★ · {item.email}</span></div><p>{item.body}</p><div><button type="button" disabled={busy !== null} onClick={() => void moderate(item.id, 'approve')}>Goedkeuren</button><button type="button" disabled={busy !== null} onClick={() => void moderate(item.id, 'reject')}>Afwijzen</button></div></article>)}
  </section>;
}
