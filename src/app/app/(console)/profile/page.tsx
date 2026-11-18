import { cookies } from 'next/headers';
import { ProfileCurrency } from '@/components/dashboard/profile-currency';
import { CURRENCY_COOKIE, openCurrency } from '@/lib/billing/currency';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const jar = await cookies();
  return <section className="profile-page"><p className="console-eyebrow">PROFIEL / BETALINGEN</p><h1>Jouw betaalvoorkeur</h1><p>Kies de valuta waarin je later wilt afrekenen. De catalogus heeft euro als basisvaluta; de definitieve prijs in jouw betaalvaluta wordt vóór een Stripe-betaling getoond.</p><ProfileCurrency initial={openCurrency(jar.get(CURRENCY_COOKIE)?.value)} /><div className="profile-note"><h2>Goed om te weten</h2><p>Deze voorkeur is nu aan de beheersessie gekoppeld. Wanneer individuele accounts beschikbaar zijn, slaan we haar per gebruiker op. Er vindt nu geen betaling plaats.</p></div></section>;
}
