import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { publicDomain } from '@/lib/public-domain';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const request = await headers();
  const domain = publicDomain(request.get('x-forwarded-host') ?? request.get('host'));
  if (domain.kind === 'admin') return [];
  const paths = domain.language === 'en' ? ['/', '/pricing', '/terms', '/privacy'] : ['/', '/prijzen', '/voorwaarden', '/privacy'];
  return paths.map((path,index) => ({ url: new URL(path,domain.origin).toString(), changeFrequency: index === 0 ? 'weekly' : 'monthly', priority: index === 0 ? 1 : index === 1 ? 0.8 : 0.3 }));
}
