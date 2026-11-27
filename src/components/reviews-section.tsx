'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Review = { name: string; rating: number; body: string; createdAt: string };
const cloud = 'https://defaultstackr.cloud';
export function ReviewsSection({ language = 'nl' }: { language?: 'nl' | 'en' } = {}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [received, setReceived] = useState(false);
  const [available, setAvailable] = useState(false);
  const en = language === 'en';
  const text = (nl: string, english: string) => en ? english : nl;
  useEffect(() => {
    setReceived(new URLSearchParams(window.location.search).get('review') === 'received');
    void fetch(`${cloud}/api/reviews`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []); setAvailable(true);
    }).catch(() => {});
  }, []);
  return <section className="reviews-section" id="reviews"><div className="wrap">
    <div className="landing-section-heading"><div><span className="section-label">/ {text('ERVARINGEN','EXPERIENCES')}</span><h2>{text('Deel jouw ervaring.','Share your experience.')}</h2></div><p>{text('Reviews verschijnen pas na beoordeling. We tonen geen verzonnen testimonials.','Reviews appear only after moderation. We do not display invented testimonials.')}</p></div>
    {reviews.length > 0 && <div className="review-cards">{reviews.map((review,index) => <article key={`${review.name}-${index}`}><span aria-label={`${review.rating} ${text('van 5 sterren','out of 5 stars')}`}>{'★'.repeat(review.rating)}</span><blockquote>{review.body}</blockquote><strong>{review.name}</strong></article>)}</div>}
    <div className="review-form-shell"><div><p className="console-eyebrow">{text('VERTEL HET ONS','TELL US')}</p><h3>{text('Wat vind je van DefaultStackr?','What do you think of DefaultStackr?')}</h3><p>{text('Je naam en beoordeling worden na goedkeuring getoond. Je e-mailadres blijft privé.','Your name and review are shown after approval. Your email address stays private.')}</p></div>
    <form action={`${cloud}/api/reviews`} method="post">
      <label>{text('Naam','Name')}<input name="name" required minLength={2} maxLength={60} /></label>
      <label>{text('E-mailadres','Email address')}<input name="email" type="email" required maxLength={254} /></label>
      <label>{text('Beoordeling','Rating')}<select name="rating" defaultValue="5" required>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} {text(value === 1 ? 'ster' : 'sterren',value === 1 ? 'star' : 'stars')}</option>)}</select></label>
      <label className="review-message">{text('Je ervaring','Your experience')}<textarea name="body" required minLength={20} maxLength={1200} rows={4} placeholder={text('Vertel wat je hebt geprobeerd en wat beter kan.','Tell us what you tried and what could be improved.')} /></label>
      <label className="review-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <p>{text('Lees onze','Read our')} <Link href="/privacy">{text('privacyverklaring','privacy policy')}</Link>. {text('We beoordelen een review voordat die publiek verschijnt.','We moderate reviews before they appear publicly.')}</p>
      <button type="submit" className="primary" disabled={!available}>{text('Review insturen','Submit review')} ↗</button>
      {!available && <p role="status">{text('Reviews insturen wordt beschikbaar zodra het cloudportaal is bijgewerkt.','Review submission will become available once the cloud portal is updated.')}</p>}
      {received && <p role="status">{text('Bedankt. Je review is ontvangen en wacht op beoordeling.','Thank you. Your review has been received and is awaiting moderation.')}</p>}
    </form></div>
  </div></section>;
}
