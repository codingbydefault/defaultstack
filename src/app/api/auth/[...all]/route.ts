import { toNextJsHandler } from 'better-auth/next-js';
import { customerAuth } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unavailable() {
  return Response.json({ error: 'Klantaanmelding is nog niet geconfigureerd.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const auth = customerAuth();
  return auth ? toNextJsHandler(auth).GET(request) : unavailable();
}

export async function POST(request: Request) {
  const auth = customerAuth();
  return auth ? toNextJsHandler(auth).POST(request) : unavailable();
}
