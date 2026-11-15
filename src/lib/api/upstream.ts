// Server-only proxy. The browser must never import this file: it reads the API key.

import { API_PREFIX } from '@/lib/api/contract';

const MASK = '••••••••';

function noStore(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function maskEnv(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(maskEnv);
  if (!data || typeof data !== 'object') return data;
  const record = { ...(data as Record<string, unknown>) };
  if (Array.isArray(record.items)) record.items = record.items.map(maskEnv);
  if (typeof record.key === 'string') {
    delete record.value;
    delete record.secret;
    record.maskedValue = MASK;
  }
  return record;
}

export async function proxyUpstream(request: Request, segments: string[]): Promise<Response> {
  if (typeof window !== 'undefined') throw new Error('The API key cannot be used in the browser.');
  const base = process.env.DEFAULTSTACKR_API_URL;
  const apiKey = process.env.DEFAULTSTACKR_API_KEY;
  if (!base || !apiKey) {
    return noStore({ error: 'De API is niet geconfigureerd. Zet DEFAULTSTACKR_API_URL en DEFAULTSTACKR_API_KEY, of DEFAULTSTACKR_MOCK=true.' }, 503);
  }
  let target: URL;
  try {
    const incoming = new URL(request.url);
    target = new URL(`${base.replace(/\/$/, '')}/${segments.join('/')}${incoming.search}`);
  } catch {
    return noStore({ error: 'DEFAULTSTACKR_API_URL is ongeldig.' }, 503);
  }
  if (target.username || target.password || target.searchParams.has('apikey') || target.searchParams.has('api_key')) {
    return noStore({ error: 'De API-sleutel mag niet in het adres staan.' }, 400);
  }

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return noStore({ error: 'De API is niet bereikbaar.' }, 502);
  }

  const text = await upstream.text();
  if (text.includes(apiKey)) return noStore({ error: 'De API-respons is tegengehouden.' }, 502);
  const envPath = segments.includes('env');
  if (!envPath) {
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  try {
    // TODO(defaultstackr-api): env responses must already be masked. This strips value/secret anyway.
    return noStore(maskEnv(JSON.parse(text) as unknown), upstream.status);
  } catch {
    return noStore({ error: 'De API gaf geen JSON terug.' }, 502);
  }
}

export const upstreamPrefix = API_PREFIX;
