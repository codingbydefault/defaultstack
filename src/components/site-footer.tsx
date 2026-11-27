import Link from 'next/link';

export function SiteFooter({ language = 'nl' }: { language?: 'nl' | 'en' } = {}) {
  const en = language === 'en';
  const text = (nl: string, english: string) => en ? english : nl;
  return <footer className="site-footer" lang={language}>
    <div className="wrap footer-trust">
      <div><p className="console-eyebrow">{text('VERTROUWEN / TRANSPARANTIE','TRUST / TRANSPARENCY')}</p><h2>{text('Jouw werk verdient een heldere basis.','Your work deserves a clear foundation.')}</h2><p>{text('Bekijk zelf wat al werkt en welke functies nog worden aangesloten. Je code blijft in je eigen repository.','See what works today and which features are still being connected. Your code stays in your own repository.')}</p></div>
      <div className="footer-trust-badges" aria-label={text('Platformeigenschappen','Platform features')}><span>◇ {text('HTTPS-verbinding','HTTPS connection')}</span><span>⌘ {text('GitHub-koppeling','GitHub connection')}</span><span>▤ {text('Projectlogboeken','Project logs')}</span></div>
      <div className="footer-stripe"><span>{text('Live betalingen via Stripe in voorbereiding','Live Stripe payments are in preparation')}</span><a href="https://stripe.com" target="_blank" rel="noopener noreferrer" aria-label="Stripe"><img src="/stripe-wordmark-white.svg" width="95" height="40" alt="Stripe" /></a></div>
    </div>
    <div className="wrap site-footer-grid">
      <div className="site-footer-brand"><Link href="/" className="brand" aria-label="DefaultStackR"><img className="official-brand-logo" src="/defaultstackr-logo.svg" width="210" height="49" alt="DefaultStackR — Your stack. Your cloud." /></Link><p>{text('Je projecten, data en uitrollen onder één dak.','Your projects, data and deployments under one roof.')}</p></div>
      <div><h2>Platform</h2><a href="https://defaultstackr.cloud/app">Dashboard</a><Link href={en ? '/pricing' : '/prijzen'}>{text('Pakketten','Plans')}</Link><Link href="/">Home</Link><Link href={en ? '/terms' : '/voorwaarden'}>{text('Algemene voorwaarden','Terms and conditions')}</Link><Link href="/privacy">{text('Privacyverklaring','Privacy policy')}</Link></div>
      <div><h2>Contact</h2><a href="mailto:codedbydefault@gmail.com">codedbydefault@gmail.com</a><span>{text('Hulst, Nederland','Hulst, Netherlands')}</span><a href="https://www.codedbydefault.com" target="_blank" rel="noopener noreferrer">CodedByDefault ↗</a></div>
      <div><h2>CodedByDefault</h2><span>Poorterslaan 157</span><span>4561 ZM Hulst</span><span>{text('KvK','Chamber of Commerce')} 42171617</span><span>{text('Btw-id','VAT ID')} NL005557496B77</span></div>
      <div><h2>{text('Techniek','Technology')}</h2><a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare ↗</a><span>{text('Netwerk en beveiliging','Network and security')}</span><a href="https://stripe.com" target="_blank" rel="noopener noreferrer">Stripe ↗</a><span>{text('Betaalverwerking in voorbereiding','Payment processing in preparation')}</span></div>
    </div>
    <div className="wrap site-footer-bottom"><span>© {new Date().getFullYear()} CodedByDefault · {text('DefaultStackr is een product van CodedByDefault.','DefaultStackr is a product of CodedByDefault.')}</span><span>Built beyond default.</span></div>
  </footer>;
}
