import Link from 'next/link';
import { getPublicLanguage } from '@/lib/public-request';
import { SiteFooter } from '@/components/site-footer';
import { PricingCards } from '@/components/pricing-cards';
import { PublicAuthActions } from '@/components/public-auth-actions';
import { SiteMenu } from '@/components/site-menu';

export async function generateMetadata() {
  const en = (await getPublicLanguage()) === 'en';
  return { title: en ? 'Plans and pricing | DefaultStackr' : 'Pakketten en prijzen | DefaultStackr', description: en ? 'Compare Free, Pro and Business for projects, database storage and planned email capacity.' : 'Vergelijk Free, Pro en Business voor je projecten, databaseopslag en toekomstige e-mailcapaciteit.', alternates: { canonical: en ? '/pricing' : '/prijzen' } };
}
export default async function PricingPage() {
  const language = await getPublicLanguage();
  const en = language === 'en';
  const text = (nl: string, english: string) => en ? english : nl;
  return <main className="pricing-page" lang={language}>
    <div className="pricing-ambient" aria-hidden="true" /><div className="floating-shapes pricing-shapes" aria-hidden="true"><span /><span /><span /></div>
    <header className="nav wrap pricing-nav"><Link href="/" className="brand"><span className="brand-icon"><i /><i /><i /></span><span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span></Link><nav className="desktop-nav" aria-label={text('Hoofdnavigatie','Main navigation')}><Link href="/">Home</Link><Link href={en ? '/pricing' : '/prijzen'} aria-current="page">{text('Pakketten','Plans')}</Link></nav><PublicAuthActions language={language} /><SiteMenu language={language} /></header>
    <section className="pricing-hero wrap"><h1>{text('Bouw vrij.','Build freely.')}<br />{text('Betaal op jouw tempo.','Pay at your own pace.')}</h1><p>{text('Kies gratis of betaal per maand of jaar.','Choose Free, or pay monthly or yearly.')}</p><div className="pricing-notice">{text('Een projectplaats is een project dat tegelijk online staat; een nieuwe versie publiceren gebruikt geen extra plaats. Abonnementen en automatische verbruikskosten worden pas beschikbaar nadat rechten, meting en Stripe-koppeling op het platform werken.','A project slot is one project that is online at a time; publishing a new version does not use another slot. Subscriptions and automatic usage charges will become available only after permissions, metering and Stripe integration work on the platform.')}</div></section>
    <PricingCards language={language} />
    <section className="pricing-explainer wrap"><div><h2>{text('Wat telt er mee?','What counts towards usage?')}</h2><p>{text('Databaseopslag is de gebruikte ruimte van alle projectdatabases samen. Bij Business tellen alleen actieve projecten boven 10 en opslag boven 5 GB als extra verbruik. Het dashboard moet actuele metingen, een kostenraming en een instelbare bestedingslimiet tonen voordat variabele facturatie aan gaat.','Database storage is the space used by all project databases together. For Business, only active projects above 10 and storage above 5 GB count as additional usage. The dashboard must show current measurements, an estimate and an adjustable spending limit before variable billing is enabled.')}</p></div><div className="pricing-meter" aria-hidden="true"><span>{text('ACTIEVE PROJECTEN','ACTIVE PROJECTS')}</span><i /><span>{text('DATABASEOPSLAG','DATABASE STORAGE')}</span><i /><span>{text('BESTEDINGSLIMIET','SPENDING LIMIT')}</span><i /></div></section>
    <section className="pricing-stripe wrap"><span className="stripe-symbol" aria-hidden="true">S</span><div><h2>{text('Betalen via Stripe','Payments through Stripe')}</h2><p>{text('Maand- en jaarabonnementen verlopen via Stripe zodra afrekenen beschikbaar is. In je profiel kun je straks een betaalvaluta kiezen; vóór betaling tonen we het definitieve bedrag in die valuta. Stripe kan betalingen omzetten naar euro voor jullie uitbetaling, afhankelijk van de accountinstellingen en wisselkosten.','Monthly and yearly subscriptions will use Stripe once checkout is available. You will be able to choose a payment currency in your profile; the final amount in that currency will be shown before payment. Depending on account settings and conversion fees, Stripe can convert payments into euros for settlement.')}</p></div><span className="pricing-availability">{text('IN VOORBEREIDING','IN PREPARATION')}</span></section>
    <SiteFooter language={language} />
  </main>;
}
