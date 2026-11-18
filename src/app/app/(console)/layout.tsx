import { Shell } from '@/components/dashboard/shell';
import { redirectToLogin } from '@/lib/auth/guard';
import { portalIdentity } from '@/lib/auth/portal';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const identity = await portalIdentity();
  if (!identity) redirectToLogin(null);
  return <Shell mock={process.env.DEFAULTSTACKR_MOCK === 'true'} identity={identity}>{children}</Shell>;
}
