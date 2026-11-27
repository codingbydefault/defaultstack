import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { publicDomain } from '@/lib/public-domain';
import { SiteFooter } from '@/components/site-footer';
import { PublicAuthActions } from '@/components/public-auth-actions';
import { ReviewsSection } from '@/components/reviews-section';
import { LandingWorkbench } from '@/components/landing-workbench';
import { SiteMenu } from '@/components/site-menu';

const copy = {
  nl: {
    nav: ['Platform', 'Werkwijze', 'Pakketten', 'Voortgang', 'Reviews'],
    home: 'DefaultStackr, naar home', navigation: 'Hoofdnavigatie',
    hero: ['Bouw vrij.', 'Beheer alles.'], intro: 'Code, data en uitrollen in één werkruimte die met je meegroeit.',
    portal: 'Ontdek het portaal', packages: 'Bekijk de pakketten', projects: 'Projecten', deployments: 'Uitrollen',
    proof: 'Gemaakt voor werk dat groeit', insights: 'Inzicht',
    featuresTitle: ['Alles wat je nodig hebt.', 'In jouw ritme.'],
    featuresIntro: 'Van je eerste project tot een groeiende dienst: je beheert de belangrijkste onderdelen vanuit één duidelijke werkruimte.',
    features: [
      ['◇', 'PROJECTEN', 'Van code naar een eigen adres', 'Maak projecten aan, koppel een repository en beheer je uitrollen vanuit hetzelfde portaal.'],
      ['▤', 'DATABASE', 'Data dicht bij je app', 'Ruimte voor projectdatabases, SQL-migraties en veilige toegang per project.'],
      ['⌁', 'INZICHT', 'Zicht op je platform', 'Bekijk de status van je projecten, logboeken, domeinen en later je verbruik.'],
    ],
    flowTitle: ['Een heldere route', 'voor elk project.'],
    flowIntro: 'Houd het werk overzichtelijk terwijl de techniek achter de schermen voor je klaarstaat.', workspace: 'Bekijk de werkruimte',
    steps: [
      ['01', 'Verbind je code', 'Kies een repository en bepaal hoe je project wordt gebouwd.'],
      ['02', 'Geef je data een plek', 'Beheer straks je database en migraties naast je applicatie.'],
      ['03', 'Volg wat er gebeurt', 'Houd uitrollen, domeinen en logboeken in één werkruimte bij.'],
    ],
    progress: 'Bekijk waar we staan.', progressIntro: 'We tonen wat al in ontwikkeling is en welke onderdelen nog nodig zijn voor een volledig publiek platform.',
    milestones: [
      ['Platform en beheerportaal', 'Projectbeheer, uitrollen en domeinflows worden getest.', 'In ontwikkeling'],
      ['Eigen database en migraties', 'De basis staat; isolatie per klant en veilige migraties volgen.', 'In ontwikkeling'],
      ['Eigen facturatie en Stripe', 'Sandboxbetalingen en eigen facturen zijn getest. Live abonnementen zijn nog niet actief.', 'In voorbereiding'],
    ],
    pricingTitle: ['Begin gratis.', 'Groei als je wilt.'],
    pricingIntro: 'Free biedt 3 actieve projecten en 2 GB databaseopslag. Pro biedt 10 projecten en 5 GB vanaf € 35,09 per maand of € 350,90 per jaar. Business begint bij € 71,39 per maand of € 713,90 per jaar, met extra verbruik op maat. Prijzen inclusief 21% Nederlandse btw.',
    pricingNote: 'Maand of jaar. Live Stripe-afrekenen in voorbereiding.', compare: 'Vergelijk de pakketten',
    contactTitle: ['Jouw volgende idee', 'begint hier.'], contactIntro: 'Wil je de ontwikkeling volgen of meedenken over het platform? We horen graag van je.', open: 'Open het portaal', contact: 'Neem contact op',
  },
  en: {
    nav: ['Platform', 'How it works', 'Plans', 'Progress', 'Reviews'],
    home: 'DefaultStackr home', navigation: 'Main navigation',
    hero: ['Build freely.', 'Manage everything.'], intro: 'Code, data and deployments in one workspace that grows with you.',
    portal: 'Explore the platform', packages: 'View the plans', projects: 'Projects', deployments: 'Deployments',
    proof: 'Built for work that grows', insights: 'Insights',
    featuresTitle: ['Everything you need.', 'At your own pace.'],
    featuresIntro: 'From your first project to a growing service: manage the essentials from one clear workspace.',
    features: [
      ['◇', 'PROJECTS', 'From code to your own address', 'Create projects, connect a repository and manage deployments from the same portal.'],
      ['▤', 'DATABASE', 'Data close to your app', 'Room for project databases, SQL migrations and secure access for each project.'],
      ['⌁', 'INSIGHTS', 'See how your platform is doing', 'Check project status, logs, domains and, later, your usage.'],
    ],
    flowTitle: ['A clear path', 'for every project.'],
    flowIntro: 'Keep your work organised while the infrastructure is prepared behind the scenes.', workspace: 'View the workspace',
    steps: [
      ['01', 'Connect your code', 'Choose a repository and define how your project is built.'],
      ['02', 'Give your data a home', 'Manage your database and migrations alongside your application as these features become available.'],
      ['03', 'Follow what happens', 'Keep deployments, domains and logs together in one workspace.'],
    ],
    progress: 'See where we stand.', progressIntro: 'We show what is being developed and what is still needed before the platform is fully public.',
    milestones: [
      ['Platform and management portal', 'Project management, deployments and domain workflows are being tested.', 'In development'],
      ['Own databases and migrations', 'The foundation is in place; customer isolation and safe migrations are next.', 'In development'],
      ['Own invoicing and Stripe', 'Sandbox payments and our own invoices have been tested. Live subscriptions are not active yet.', 'In preparation'],
    ],
    pricingTitle: ['Start for free.', 'Grow when you want.'],
    pricingIntro: 'Free includes 3 active projects and 2 GB of database storage. Pro offers 10 projects and 5 GB from €35.09 per month or €350.90 per year. Business starts at €71.39 per month or €713.90 per year, with additional usage priced separately. Prices include 21% Dutch VAT.',
    pricingNote: 'Monthly or yearly. Live Stripe checkout is in preparation.', compare: 'Compare the plans',
    contactTitle: ['Your next idea', 'starts here.'], contactIntro: 'Want to follow our progress or contribute ideas? We would like to hear from you.', open: 'Open the platform', contact: 'Get in touch',
  },
};

export default async function Home() {
  const request = await headers();
  const domain = publicDomain(request.get('x-forwarded-host') ?? request.get('host'));
  if (domain.kind === 'admin') redirect('/app');
  const language = domain.language;
  const c = copy[language];
  const pricing = language === 'en' ? '/pricing' : '/prijzen';
  const portal = 'https://defaultstackr.cloud/app';
  return <main className="landing" lang={language}>
    <a className="skip-link" href="#landing-title">{language === 'en' ? 'Skip to content' : 'Naar de inhoud'}</a>
    <header className="nav wrap landing-nav">
      <Link href="/" className="brand" aria-label={c.home}><span className="brand-icon"><i /><i /><i /></span><span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span></Link>
      <nav className="desktop-nav" aria-label={c.navigation}><a href="#platform">{c.nav[0]}</a><a href="#werkwijze">{c.nav[1]}</a><Link href={pricing}>{c.nav[2]}</Link><a href="#voortgang">{c.nav[3]}</a><a href="#reviews">{c.nav[4]}</a></nav>
      <PublicAuthActions language={language} /><SiteMenu language={language} />
    </header>
    <section className="landing-hero wrap" aria-labelledby="landing-title"><div className="landing-hero-copy"><h1 id="landing-title" tabIndex={-1}>{c.hero[0]}<br />{c.hero[1]}</h1><p>{c.intro}</p><div className="landing-actions"><a href={portal} className="primary">{c.portal}</a><Link href={pricing} className="outline">{c.packages}</Link></div><div className="landing-hero-meta"><span>{c.projects}</span><span>PostgreSQL</span><span>{c.deployments}</span></div></div><LandingWorkbench language={language} /></section>
    <section className="landing-proof wrap" aria-label={c.nav[0]}><span>{c.proof}</span><div><span>Code</span><span>Data</span><span>{c.deployments}</span><span>{c.insights}</span></div></section>
    <section className="landing-section wrap" id="platform"><span id="vision" aria-hidden="true" /><div className="landing-section-heading"><div><h2>{c.featuresTitle[0]}<br />{c.featuresTitle[1]}</h2></div><p>{c.featuresIntro}</p></div><div className="landing-feature-grid">{c.features.map(([icon,label,title,text]) => <article key={label} className="landing-feature"><span className="landing-feature-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{text}</p><span className="landing-feature-arrow" aria-hidden="true">↗</span></article>)}</div></section>
    <section className="landing-flow" id="werkwijze"><div className="wrap landing-flow-inner"><div className="landing-flow-intro"><h2>{c.flowTitle[0]}<br />{c.flowTitle[1]}</h2><p>{c.flowIntro}</p><a href={portal} className="outline">{c.workspace}</a></div><div className="landing-flow-steps">{c.steps.map(([number,title,text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><b aria-hidden="true">↗</b></article>)}</div></div></section>
    <section className="landing-progress wrap" id="voortgang"><span id="progress" aria-hidden="true" /><div className="landing-section-heading"><div><h2>{c.progress}</h2></div><p>{c.progressIntro}</p></div><div className="landing-progress-list">{c.milestones.map(([title,detail,status]) => <article key={title}><div><h3>{title}</h3><p>{detail}</p></div><span className="milestone-badge">{status}</span></article>)}</div></section>
    <section className="landing-pricing wrap"><div><h2>{c.pricingTitle[0]}<br />{c.pricingTitle[1]}</h2><p>{c.pricingIntro}</p><span className="landing-pricing-note">{c.pricingNote}</span><Link href={pricing} className="primary">{c.compare}</Link></div><div className="landing-pricing-art" aria-hidden="true"><span className="pricing-art-ring ring-a" /><span className="pricing-art-ring ring-b" /><span className="pricing-art-core">DS<span>R</span></span></div></section>
    <section className="landing-contact wrap" id="contact"><h2>{c.contactTitle[0]}<br />{c.contactTitle[1]}</h2><p>{c.contactIntro}</p><div><a href={portal} className="primary">{c.open}</a><a href="mailto:codedbydefault@gmail.com?subject=DefaultStackr%20contact" className="outline">{c.contact}</a></div></section>
    <ReviewsSection language={language} /><SiteFooter language={language} />
  </main>;
}
