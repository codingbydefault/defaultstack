import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirectToLogin } from '@/lib/auth/guard';
import { LOGIN_TARGET_HEADER } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Beheer — DefaultStackr',
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const target = (await headers()).get(LOGIN_TARGET_HEADER);
  if (target) redirectToLogin(target);
  return children;
}
