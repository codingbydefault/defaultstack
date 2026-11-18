import Link from 'next/link';
import { plans } from '@/lib/billing/plans';

export default function MailPage() {
  return <section className="mail-page">
    <p className="console-eyebrow">WERKRUIMTE / E-MAIL</p>
    <h1>Je postvakken, straks op één plek.</h1>
    <p className="mail-intro">E-mail is in voorbereiding. Er is nog geen mailserver aangesloten, dus je kunt hier nog geen postvakken aanmaken, berichten ontvangen of verzenden.</p>
    <div className="mail-plan-grid">
      <article className="mail-plan"><span>FREE</span><strong>{plans.free.mailboxesPerProfile} postvak</strong><p>{plans.free.mailboxGb} GB opslag. Kies straks een adres op x.defaultstackr.nl of x.defaultstackr.online.</p></article>
      <article className="mail-plan"><span>PRO</span><strong>{plans.pro.mailboxesPerDomain} postvakken</strong><p>Per gekoppeld domein. Elk postvak krijgt {plans.pro.mailboxGb} GB opslag.</p></article>
      <article className="mail-plan"><span>BUSINESS</span><strong>{plans.business.mailboxesPerDomain} postvakken</strong><p>Per gekoppeld domein. Elk postvak krijgt {plans.business.mailboxGb} GB opslag.</p></article>
    </div>
    <div className="mail-status"><span className="mail-status-icon" aria-hidden="true">✉</span><div><h2>Wat gebeurt er vóór activatie?</h2><p>We richten de mailserver, domeinverificatie, veilige toegang en opslaglimieten in. Daarna verschijnen je eigen domeinen en postvakken hier.</p></div><Link href="/prijzen" className="outline">Bekijk pakketten ↗</Link></div>
  </section>;
}
