import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/prijzen', '/voorwaarden', '/privacy'].map(path => ({
    url: new URL(path, PUBLIC_SITE_URL).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/prijzen' ? 0.8 : 0.3,
  }));
}
