'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Review = { name: string; rating: number; body: string; createdAt: string };
const cloud = 'https://www.defaultstackr.cloud';

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [received, setReceived] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setReceived(new URLSearchParams(window.location.search).get('review') === 'received');
    void fetch(`${cloud}/api/reviews`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setAvailable(true);
    }).catch(() => {});
  }, []);

  return <section className="reviews-section" id="reviews"><div className="wrap"><div className="landing-section-heading"><div><span className="section-label">/ ERVARINGEN</span><h2>Deel jouw ervaring.</h2></div><p>Reviews verschijnen pas na beoordeling. We tonen geen verzonnen testimonials.</p></div>
    {reviews.length > 0 && <div className="review-cards">{reviews.map((review, index) => <article key={`${review.name}-${index}`}><span aria-label={`${review.rating} van 5 sterren`}>{'★'.repeat(review.rating)}</span><blockquote>{review.body}</blockquote><strong>{review.name}</strong></article>)}</div>}
    <div className="review-form-shell"><div><p className="console-eyebrow">VERTEL HET ONS</p><h3>Wat vind je van DefaultStackr?</h3><p>Je naam en beoordeling worden na goedkeuring getoond. Je e-mailadres blijft privé.</p></div><form action={`${cloud}/api/reviews`} method="post">
      <label>Naam<input name="name" required minLength={2} maxLength={60} /></label>
      <label>E-mailadres<input name="email" type="email" required maxLength={254} /></label>
      <label>Beoordeling<select name="rating" defaultValue="5" required><option value="5">5 sterren</option><option value="4">4 sterren</option><option value="3">3 sterren</option><option value="2">2 sterren</option><option value="1">1 ster</option></select></label>
      <label className="review-message">Je ervaring<textarea name="body" required minLength={20} maxLength={1200} rows={4} placeholder="Vertel wat je hebt geprobeerd en wat beter kan." /></label>
      <label className="review-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <p>Lees onze <Link href="/privacy">privacyverklaring</Link>. We beoordelen een review voordat die publiek verschijnt.</p>
      <button type="submit" className="primary" disabled={!available}>Review insturen ↗</button>
      {!available && <p role="status">Reviews insturen wordt beschikbaar zodra het cloudportaal is bijgewerkt.</p>}
      {received && <p role="status">Bedankt. Je review is ontvangen en wacht op beoordeling.</p>}
    </form></div>
  </div></section>;
}
