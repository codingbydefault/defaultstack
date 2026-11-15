import { Shell } from '@/components/dashboard/shell';
import { requireSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <Shell mock={process.env.DEFAULTSTACKR_MOCK === 'true'}>{children}</Shell>;
}
