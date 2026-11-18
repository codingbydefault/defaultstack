'use client';

import { useState } from 'react';
import { businessMonthlyUsageCents, euro, plans } from '@/lib/billing/plans';

type Period = 'month' | 'year';

export function PricingCards() {
  const [period, setPeriod] = useState<Period>('month');
  const [projects, setProjects] = useState(10);
  const [database, setDatabase] = useState(5);
  const usage = businessMonthlyUsageCents(projects, database);
  const yearly = period === 'year';

  return <section className="wrap" aria-label="Pakketten">
    <div className="pricing-period" role="group" aria-label="Betaalperiode">
      <button type="button" aria-pressed={!yearly} className={!yearly ? 'selected' : ''} onClick={() => setPeriod('month')}>Maandelijks</button>
      <button type="button" aria-pressed={yearly} className={yearly ? 'selected' : ''} onClick={() => setPeriod('year')}>Jaarlijks <span>2 maanden voordeel</span></button>
    </div>
    <div className="pricing-grid">
      <article className="pricing-card free"><div className="pricing-card-top"><span>OM TE STARTEN</span><b>Free</b></div><h2>Bouw op jouw tempo.</h2><p>Voor een eerste app of een klein portfolio.</p><strong className="pricing-price">€ 0 <small>/ maand</small></strong><span className="pricing-availability">GRATIS</span><ul><li>3 actieve projecten tegelijk</li><li>2 GB databaseopslag totaal</li><li>1 postvak van 2 GB op een DefaultStackr-subdomein*</li><li>Projectadres en basislogboeken</li><li>Geen betaalkaart nodig</li></ul><a href="/app" className="outline">Open het dashboard ↗</a></article>
      <article className="pricing-card pro"><div className="pricing-card-top"><span>VOOR GROEI</span><b>Pro</b></div><h2>Meer ruimte voor je werk.</h2><p>Voor actieve webshops en SaaS-projecten.</p><strong className="pricing-price">{euro(yearly ? plans.pro.yearlyCents : plans.pro.monthlyCents)} <small>/ {yearly ? 'jaar' : 'maand'}</small></strong><span className="pricing-availability">EXCL. BTW · {yearly ? '€ 24,17 PER MAAND OMGEREKEND' : '€ 290 PER JAAR MOGELIJK'}</span><ul><li>10 actieve projecten tegelijk</li><li>5 GB databaseopslag totaal</li><li>10 postvakken per eigen domein, elk 10 GB*</li><li>Eigen domeinen en projectlogboeken</li><li>Geen automatische meerkosten</li></ul><a href="mailto:codedbydefault@gmail.com?subject=DefaultStackr%20Pro" className="outline">Vraag Pro aan ↗</a></article>
      <article className="pricing-card business"><div className="pricing-card-top"><span>VOOR GROTER VERBRUIK</span><b>Business</b></div><h2>Capaciteit op maat.</h2><p>Een vaste basis plus meetbaar extra verbruik.</p><strong className="pricing-price">{euro(yearly ? plans.business.yearlyCents : plans.business.monthlyCents)} <small>/ {yearly ? 'jaar' : 'maand'} basis</small></strong><span className="pricing-availability">EXCL. BTW · EXTRA VERBRUIK MAANDELIJKS</span><ul><li>10 actieve projecten en 5 GB inbegrepen</li><li>25 postvakken per eigen domein, elk 10 GB*</li><li>€ 5 per extra actief project per maand</li><li>€ 2 per extra GB database per maand</li><li>Extra kosten pas na ingestelde limiet en akkoord</li></ul><a href="mailto:codedbydefault@gmail.com?subject=DefaultStackr%20Business" className="outline">Bespreek Business ↗</a></article>
    </div>
    <div className="business-calculator"><div><p className="console-eyebrow">BUSINESS RAMING</p><h2>Bereken je verbruik</h2><p>Dit is een maandraming exclusief btw. De jaarprijs dekt alleen de vaste basis.</p></div><label>Actieve projecten<input type="number" min="0" max="10000" value={projects} onChange={event => setProjects(Math.max(0, Number(event.target.value) || 0))} /></label><label>Databaseopslag (GB)<input type="number" min="0" max="100000" step="0.1" value={database} onChange={event => setDatabase(Math.max(0, Number(event.target.value) || 0))} /></label><strong>+ {euro(usage)} <small>/ maand extra</small></strong></div>
    <p className="pricing-footnote">* E-mail is gepland en nog niet actief: postvakken aanmaken, verzenden en ontvangen kan pas na inrichting van de mailserver. Free kiest straks een adres op x.defaultstackr.nl of x.defaultstackr.online. Databasegebruik wordt per begonnen GB boven de inbegrepen 5 GB berekend. De maandelijkse projecttelling en opslagmeting worden vóór activatie technisch vastgelegd en zichtbaar gemaakt. Er is nu geen automatische afschrijving.</p>
  </section>;
}
