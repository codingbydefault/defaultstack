import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { PricingCards } from '@/components/pricing-cards';

export default function PricingPage() {
  return <main className="pricing-page" lang="nl">
    <div className="pricing-ambient" aria-hidden="true" />
    <header className="nav wrap pricing-nav"><Link href="/" className="brand"><span className="brand-icon"><i /><i /><i /></span><span>Default<span className="accent">Stackr</span><small>by CodedByDefault</small></span></Link><nav><Link href="/">Home</Link><Link href="/prijzen" aria-current="page">Pakketten</Link></nav><Link href="/app" className="outline nav-cta">Dashboard ↗</Link></header>
    <section className="pricing-hero wrap"><p className="console-eyebrow"><span className="pulse-dot" /> DEFAULTSTACKR / PAKKETTEN</p><h1>Ruimte om te bouwen.<br /><em>Een prijs die meegroeit.</em></h1><p>Kies gratis of betaal per maand of jaar. Een projectplaats is een project dat tegelijk online staat; een nieuwe versie publiceren gebruikt geen extra plaats.</p><div className="pricing-notice">De pakketten zijn vastgesteld. Abonnementen en automatische verbruikskosten worden pas beschikbaar nadat rechten, meting en Stripe-koppeling op het platform werken.</div></section>
    <PricingCards />
    <section className="pricing-explainer wrap"><div><p className="console-eyebrow">TRANSPARANT VERBRUIK</p><h2>Wat telt er mee?</h2><p>Databaseopslag is de gebruikte ruimte van alle projectdatabases samen. Bij Business tellen alleen actieve projecten boven 10 en opslag boven 5 GB als extra verbruik. Het dashboard moet actuele metingen, een kostenraming en een instelbare bestedingslimiet tonen voordat variabele facturatie aan gaat.</p></div><div className="pricing-meter" aria-hidden="true"><span>ACTIEVE PROJECTEN</span><i /><span>DATABASEOPSLAG</span><i /><span>BESTEDINGSLIMIET</span><i /></div></section>
    <section className="pricing-stripe wrap"><span className="stripe-symbol" aria-hidden="true">S</span><div><h2>Betalen via Stripe</h2><p>Maand- en jaarabonnementen verlopen via Stripe zodra afrekenen beschikbaar is. In je profiel kun je straks een betaalvaluta kiezen; vóór betaling tonen we het definitieve bedrag in die valuta. Stripe kan betalingen omzetten naar euro voor jullie uitbetaling, afhankelijk van de accountinstellingen en wisselkosten.</p></div><span className="pricing-availability">IN VOORBEREIDING</span></section>
    <SiteFooter />
  </main>;
}
