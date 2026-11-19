import Link from 'next/link';
import { redirectToLogin } from '@/lib/auth/guard';
import { portalIdentity } from '@/lib/auth/portal';
import { notFound } from 'next/navigation';
import { ReviewModeration } from '@/components/dashboard/review-moderation';
import { OperationsPanel } from '@/components/dashboard/operations-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const identity = await portalIdentity();
  if (identity?.kind === 'customer') notFound();
  if (identity?.kind !== 'admin') redirectToLogin(null);
  return <section className="admin-page"><p className="console-eyebrow">BEHEER / PLATFORM</p><h1>Beheerdersportaal</h1><p>Dit overzicht is alleen toegankelijk met de beheerderssessie.</p><OperationsPanel /><div className="admin-grid"><Link href="/app"><span>01 / PROJECTEN</span><strong>Alle projecten</strong><p>Bekijk uitrollen, domeinen, logboeken en SQL-migraties.</p><b aria-hidden="true">↗</b></Link><Link href="/app/mail"><span>02 / E-MAIL</span><strong>Postvakken</strong><p>Bekijk de geplande mailcapaciteit en de huidige status.</p><b aria-hidden="true">↗</b></Link><Link href="/prijzen"><span>03 / PAKKETTEN</span><strong>Prijzen en verbruik</strong><p>Controleer de publieke pakketinformatie en verbruiksraming.</p><b aria-hidden="true">↗</b></Link></div><ReviewModeration /></section>;
}
