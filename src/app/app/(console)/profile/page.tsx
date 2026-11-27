import { cookies } from 'next/headers';
import { ProfileCurrency } from '@/components/dashboard/profile-currency';
import { CURRENCY_COOKIE, openCurrency } from '@/lib/billing/currency';
import { portalIdentity } from '@/lib/auth/portal';
import Link from 'next/link';
import { GitHubSetup } from '@/components/dashboard/github-setup';
import { githubConfig } from '@/lib/github/connection';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const jar = await cookies();
  const identity = await portalIdentity();
  return <section className="profile-page"><p className="console-eyebrow">PROFIEL / BETALINGEN</p><h1>Jouw profiel</h1><p>Kies de valuta waarin je later wilt afrekenen. De catalogus heeft euro als basisvaluta; de definitieve prijs in jouw betaalvaluta wordt vóór een Stripe-betaling getoond.</p>{identity?.kind === 'customer' && identity.owner && <section className="profile-note owner-account-note"><h2>Eigenaarsprofiel</h2><p>Jouw profiel is vrijgesteld van abonnementskosten en pakketlimieten voor projecten en opslag. De beschikbare capaciteit wordt bepaald door je eigen server.</p></section>}{identity?.kind === 'customer' && identity.owner && !githubConfig() && <GitHubSetup/>}<ProfileCurrency initial={openCurrency(jar.get(CURRENCY_COOKIE)?.value)} />{identity?.kind === 'admin' && <div className="profile-note admin-entry"><div><h2>Beheerdersportaal</h2><p>Platformbeheer is alleen beschikbaar met jouw beheerderssessie.</p></div><Link className="primary" href="/app/admin">Open beheer ↗</Link></div>}<div className="profile-note"><h2>Goed om te weten</h2><p>Deze betaalvoorkeur wordt voorlopig in deze browser bewaard. Er vindt nu geen betaling plaats.</p></div></section>;
}
