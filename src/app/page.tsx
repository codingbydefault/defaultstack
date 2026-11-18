import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { PublicAuthActions } from '@/components/public-auth-actions';
import { ReviewsSection } from '@/components/reviews-section';

const steps = [
  { number: '01', title: 'Verbind je code', text: 'Kies een repository en bepaal hoe je project wordt gebouwd.' },
  { number: '02', title: 'Geef je data een plek', text: 'Beheer straks je database en migraties naast je applicatie.' },
  { number: '03', title: 'Volg wat er gebeurt', text: 'Houd uitrollen, domeinen en logboeken in één werkruimte bij.' },
];

const features = [
  { icon: '◇', label: 'PROJECTEN', title: 'Van code naar een eigen adres', text: 'Maak projecten aan, koppel een repository en beheer je uitrollen vanuit hetzelfde portaal.' },
  { icon: '▤', label: 'DATABASE', title: 'Data dicht bij je app', text: 'Ruimte voor projectdatabases, SQL-migraties en veilige toegang per project.' },
  { icon: '⌁', label: 'INZICHT', title: 'Zicht op je platform', text: 'Bekijk de status van je projecten, logboeken, domeinen en later je verbruik.' },
];

const milestones = [
  { title: 'Platform en beheerportaal', detail: 'Projectbeheer, uitrollen en domeinflows worden getest.', status: 'In ontwikkeling' },
  { title: 'Eigen database en migraties', detail: 'De basis staat; isolatie per klant en veilige migraties volgen.', status: 'In ontwikkeling' },
  { title: 'Abonnementen via Stripe', detail: 'Pakketten en prijzen staan klaar. Afrekenen volgt na rechten en verbruiksmeting.', status: 'In voorbereiding' },
];

export default function Home() {
  return (
    <main className="landing" lang="nl">
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="floating-shapes landing-shapes" aria-hidden="true"><span /><span /><span /><span /></div>
      <header className="nav wrap landing-nav">
        <Link href="/" className="brand" aria-label="DefaultStackr, naar home">
          <span className="brand-icon"><i /><i /><i /></span>
          <span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span>
        </Link>
        <nav aria-label="Hoofdnavigatie">
          <a href="#platform">Platform</a>
          <a href="#werkwijze">Werkwijze</a>
          <Link href="/prijzen">Pakketten</Link>
          <a href="#voortgang">Voortgang</a>
          <a href="#reviews">Reviews</a>
        </nav>
        <PublicAuthActions />
      </header>

      <section className="landing-hero wrap" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><span className="pulse-dot" /> JOUW STACK. JOUW WERKRUIMTE.</span>
          <h1 id="landing-title">Bouw vrij.<br /><em>Beheer alles.</em></h1>
          <p>Je applicatie, database en uitrollen op één plek. DefaultStackr groeit uit tot de cloudwerkruimte voor bedrijven en creators die zelf willen bouwen.</p>
          <div className="landing-actions">
            <Link href="/app" className="primary">Ontdek het portaal <span aria-hidden="true">↗</span></Link>
            <Link href="/prijzen" className="outline">Bekijk de pakketten <span aria-hidden="true">→</span></Link>
          </div>
          <div className="landing-hero-meta"><span>PROJECTEN</span><i /><span>POSTGRESQL</span><i /><span>UITROLLEN</span></div>
        </div>
        <div className="landing-visual" role="img" aria-label="Conceptweergave van de DefaultStackr werkruimte">
          <div className="landing-visual-glow" aria-hidden="true" />
          <div className="landing-window">
            <div className="landing-window-top"><div className="dots"><i /><i /><i /></div><span>DEFAULTSTACKR / WORKSPACE</span><span className="landing-window-live">CONCEPT</span></div>
            <div className="landing-window-body">
              <div className="landing-window-sidebar" aria-hidden="true"><span className="landing-window-logo">◈</span><span className="selected">▦</span><span>◇</span><span>▤</span><span>⌁</span></div>
              <div className="landing-window-content">
                <div className="landing-window-heading"><div><small>WERKRUIMTE / OVERZICHT</small><strong>Alles op één plek.</strong></div><span>＋ Nieuw project</span></div>
                <div className="landing-window-stats"><div><small>PROJECTEN</small><strong>03</strong><i /></div><div><small>LIVE</small><strong>02</strong><i /></div><div><small>DATABASE</small><strong>2 GB</strong><i /></div></div>
                <div className="landing-window-project"><span className="landing-project-avatar">S</span><div><strong>studio-project</strong><small>studio-project.defaultstackr.cloud</small></div><span className="landing-project-state">● LIVE</span></div>
                <div className="landing-window-project"><span className="landing-project-avatar alt">W</span><div><strong>webshop-demo</strong><small>webshop-demo.defaultstackr.cloud</small></div><span className="landing-project-state pending">● IN UITROL</span></div>
              </div>
            </div>
          </div>
          <div className="landing-float landing-float-top" aria-hidden="true"><span>✦</span><div><strong>Project online</strong><small>Je volgende idee heeft een plek.</small></div></div>
          <div className="landing-float landing-float-bottom" aria-hidden="true"><span>▤</span><div><strong>Database dichtbij</strong><small>Code en data samen.</small></div></div>
        </div>
      </section>

      <section className="landing-proof wrap" aria-label="Platformonderdelen">
        <span>GEMAAKT VOOR WERK DAT GROEIT</span>
        <div><span>01 / CODE</span><span>02 / DATA</span><span>03 / DEPLOY</span><span>04 / INZICHT</span></div>
      </section>

      <section className="landing-section wrap" id="platform">
        <div className="landing-section-heading"><div><span className="section-label">/ ÉÉN VERBONDEN PLATFORM</span><h2>Alles wat je nodig hebt.<br /><em>In jouw ritme.</em></h2></div><p>Van je eerste project tot een groeiende dienst: je beheert de belangrijkste onderdelen vanuit één duidelijke werkruimte.</p></div>
        <div className="landing-feature-grid">{features.map(feature => <article key={feature.label} className="landing-feature"><span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span><span className="landing-feature-label">{feature.label}</span><h3>{feature.title}</h3><p>{feature.text}</p><span className="landing-feature-arrow" aria-hidden="true">↗</span></article>)}</div>
      </section>

      <section className="landing-flow" id="werkwijze"><div className="wrap landing-flow-inner"><div className="landing-flow-intro"><span className="section-label">/ VAN IDEE NAAR ONLINE</span><h2>Een heldere route<br /><em>voor elk project.</em></h2><p>Houd het werk overzichtelijk terwijl de techniek achter de schermen voor je klaarstaat.</p><Link href="/app" className="outline">Bekijk de werkruimte ↗</Link></div><div className="landing-flow-steps">{steps.map(step => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><b aria-hidden="true">↗</b></article>)}</div></div></section>

      <section className="landing-progress wrap" id="voortgang"><div className="landing-section-heading"><div><span className="section-label">/ WE BOUWEN OPENLIJK</span><h2>Bekijk waar we staan.</h2></div><p>We tonen wat al in ontwikkeling is en welke onderdelen nog nodig zijn voor een volledig publiek platform.</p></div><div className="landing-progress-list">{milestones.map((item, index) => <article key={item.title}><span className="landing-progress-number">0{index + 1}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div><span className="milestone-badge">{item.status}</span></article>)}</div></section>

      <section className="landing-pricing wrap"><div><span className="section-label">/ FREE · PRO · BUSINESS</span><h2>Begin gratis.<br /><em>Groei als je wilt.</em></h2><p>Free biedt 3 actieve projecten en 2 GB databaseopslag. Pro biedt 10 projecten en 5 GB vanaf € 29 per maand of € 290 per jaar. Business begint bij € 59 per maand of € 590 per jaar, met extra verbruik op maat.</p><span className="landing-pricing-note">MAAND OF JAAR · STRIPE-AFREKENEN IN VOORBEREIDING</span><Link href="/prijzen" className="primary">Vergelijk de pakketten <span aria-hidden="true">↗</span></Link></div><div className="landing-pricing-art" aria-hidden="true"><span className="pricing-art-ring ring-a" /><span className="pricing-art-ring ring-b" /><span className="pricing-art-core">DS<span>R</span></span></div></section>

      <section className="landing-contact wrap" id="contact"><span className="section-label">/ BOUW MEE</span><h2>Jouw volgende idee<br /><em>begint hier.</em></h2><p>Wil je de ontwikkeling volgen of meedenken over het platform? We horen graag van je.</p><div><Link href="/app" className="primary">Open het portaal ↗</Link><a href="mailto:codedbydefault@gmail.com?subject=DefaultStackr%20contact" className="outline">Neem contact op ↗</a></div></section>
      <ReviewsSection />
      <SiteFooter />
    </main>
  );
}
