import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { publicDomain } from '@/lib/public-domain';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const request = await headers();
  const domain = publicDomain(request.get('x-forwarded-host') ?? request.get('host'));
  if (domain.kind === 'admin') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/app', '/api/'] }, sitemap: `${domain.origin}/sitemap.xml` };
}
