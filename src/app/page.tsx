import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { PublicAuthActions } from '@/components/public-auth-actions';
import { ReviewsSection } from '@/components/reviews-section';
import { LandingWorkbench } from '@/components/landing-workbench';
import { SiteMenu } from '@/components/site-menu';

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
      <header className="nav wrap landing-nav">
        <Link href="/" className="brand" aria-label="DefaultStackr, naar home">
          <span className="brand-icon"><i /><i /><i /></span>
          <span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Hoofdnavigatie">
          <a href="#platform">Platform</a>
          <a href="#werkwijze">Werkwijze</a>
          <Link href="/prijzen">Pakketten</Link>
          <a href="#voortgang">Voortgang</a>
          <a href="#reviews">Reviews</a>
        </nav>
        <PublicAuthActions />
        <SiteMenu />
      </header>

      <section className="landing-hero wrap" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">Bouw vrij.<br />Beheer alles.</h1>
          <p>Code, data en uitrollen in één werkruimte die met je meegroeit.</p>
          <div className="landing-actions">
            <Link href="/app" className="primary">Ontdek het portaal</Link>
            <Link href="/prijzen" className="outline">Bekijk de pakketten</Link>
          </div>
          <div className="landing-hero-meta"><span>Projecten</span><span>PostgreSQL</span><span>Uitrollen</span></div>
        </div>
        <LandingWorkbench />
      </section>

      <section className="landing-proof wrap" aria-label="Platformonderdelen">
        <span>Gemaakt voor werk dat groeit</span>
        <div><span>Code</span><span>Data</span><span>Uitrollen</span><span>Inzicht</span></div>
      </section>

      <section className="landing-section wrap" id="platform">
        <div className="landing-section-heading"><div><h2>Alles wat je nodig hebt.<br />In jouw ritme.</h2></div><p>Van je eerste project tot een groeiende dienst: je beheert de belangrijkste onderdelen vanuit één duidelijke werkruimte.</p></div>
        <div className="landing-feature-grid">{features.map(feature => <article key={feature.label} className="landing-feature"><span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span><span className="landing-feature-label">{feature.label}</span><h3>{feature.title}</h3><p>{feature.text}</p><span className="landing-feature-arrow" aria-hidden="true">↗</span></article>)}</div>
      </section>

      <section className="landing-flow" id="werkwijze"><div className="wrap landing-flow-inner"><div className="landing-flow-intro"><h2>Een heldere route<br />voor elk project.</h2><p>Houd het werk overzichtelijk terwijl de techniek achter de schermen voor je klaarstaat.</p><Link href="/app" className="outline">Bekijk de werkruimte</Link></div><div className="landing-flow-steps">{steps.map(step => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><b aria-hidden="true">↗</b></article>)}</div></div></section>

      <section className="landing-progress wrap" id="voortgang"><div className="landing-section-heading"><div><h2>Bekijk waar we staan.</h2></div><p>We tonen wat al in ontwikkeling is en welke onderdelen nog nodig zijn voor een volledig publiek platform.</p></div><div className="landing-progress-list">{milestones.map((item, index) => <article key={item.title}><span className="landing-progress-number">0{index + 1}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div><span className="milestone-badge">{item.status}</span></article>)}</div></section>

      <section className="landing-pricing wrap"><div><h2>Begin gratis.<br />Groei als je wilt.</h2><p>Free biedt 3 actieve projecten en 2 GB databaseopslag. Pro biedt 10 projecten en 5 GB vanaf € 29 per maand of € 290 per jaar. Business begint bij € 59 per maand of € 590 per jaar, met extra verbruik op maat.</p><span className="landing-pricing-note">Maand of jaar. Stripe-afrekenen in voorbereiding.</span><Link href="/prijzen" className="primary">Vergelijk de pakketten</Link></div><div className="landing-pricing-art" aria-hidden="true"><span className="pricing-art-ring ring-a" /><span className="pricing-art-ring ring-b" /><span className="pricing-art-core">DS<span>R</span></span></div></section>

      <section className="landing-contact wrap" id="contact"><h2>Jouw volgende idee<br />begint hier.</h2><p>Wil je de ontwikkeling volgen of meedenken over het platform? We horen graag van je.</p><div><Link href="/app" className="primary">Open het portaal</Link><a href="mailto:codedbydefault@gmail.com?subject=DefaultStackr%20contact" className="outline">Neem contact op</a></div></section>
      <ReviewsSection />
      <SiteFooter />
    </main>
  );
}
