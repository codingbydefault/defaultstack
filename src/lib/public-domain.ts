export function publicDomain(raw: string | null) {
  const host = (raw ?? '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (['defaultstackr.online', 'www.defaultstackr.online'].includes(host)) {
    return { language: 'en', origin: 'https://defaultstackr.online', kind: 'public' } as const;
  }
  if (['defaultstackr.cloud', 'www.defaultstackr.cloud', 'app.defaultstackr.cloud'].includes(host)) {
    return { language: 'nl', origin: 'https://defaultstackr.cloud', kind: 'admin' } as const;
  }
  return { language: 'nl', origin: 'https://defaultstackr.nl', kind: 'public' } as const;
}
