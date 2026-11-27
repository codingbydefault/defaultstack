import { headers } from 'next/headers';
import { publicDomain } from '@/lib/public-domain';

export async function getPublicLanguage(): Promise<'nl' | 'en'> {
  const request = await headers();
  return publicDomain(request.get('x-forwarded-host') ?? request.get('host')).language;
}
