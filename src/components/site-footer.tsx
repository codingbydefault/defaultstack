import Link from 'next/link';

export function SiteFooter() {
  return <footer className="site-footer" lang="nl">
    <div className="wrap footer-trust">
      <div><p className="console-eyebrow">VERTROUWEN / TRANSPARANTIE</p><h2>Jouw werk verdient een heldere basis.</h2><p>Bekijk zelf wat al werkt en welke functies nog worden aangesloten. Je code blijft in je eigen repository.</p></div>
      <div className="footer-trust-badges" aria-label="Platformeigenschappen"><span>◇ HTTPS-verbinding</span><span>⌘ GitHub-koppeling</span><span>▤ Projectlogboeken</span></div>
      <div className="footer-stripe"><span>Betalingen via Stripe zodra de checkout beschikbaar is</span><a href="https://stripe.com" target="_blank" rel="noopener noreferrer" aria-label="Stripe"><img src="/stripe-wordmark-white.svg" width="95" height="40" alt="Stripe" /></a></div>
    </div>
    <div className="wrap site-footer-grid">
      <div className="site-footer-brand"><Link href="/" className="brand"><span className="brand-icon mini"><i /><i /><i /></span><span>Default<span className="accent">Stackr</span><small>Een product van CodedByDefault</small></span></Link><p>Je projecten, data en uitrollen onder één dak.</p></div>
      <div><h2>Platform</h2><Link href="/app">Dashboard</Link><Link href="/prijzen">Pakketten</Link><Link href="/">Home</Link><Link href="/voorwaarden">Algemene voorwaarden</Link><Link href="/privacy">Privacyverklaring</Link></div>
      <div><h2>Contact</h2><a href="mailto:codedbydefault@gmail.com">codedbydefault@gmail.com</a><span>Hulst, Nederland</span></div>
      <div><h2>CodedByDefault</h2><span>Poorterslaan 157</span><span>4561 ZM Hulst</span><span>KvK 42171617</span><span>Btw-id NL005557496B77</span></div>
    </div>
    <div className="wrap site-footer-bottom"><span>© {new Date().getFullYear()} CodedByDefault · DefaultStackr is een product van CodedByDefault.</span><span>Built beyond default.</span></div>
  </footer>;
}
