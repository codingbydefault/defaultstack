import { isSafeSegment } from '@/lib/api/contract';
import { mockHandle } from '@/lib/api/mock-store';
import { handleRealApi } from '@/lib/api/real-store';

export async function handleStack(request: Request, segments: string[]): Promise<Response> {
  if (segments.length === 0 || segments.length > 6 || segments.some(segment => !isSafeSegment(segment))) {
    return Response.json({ error: 'Ongeldig pad.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (segments[0] !== 'v1') {
    return Response.json({ error: 'Onbekende API-versie.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  if (process.env.DEFAULTSTACKR_MOCK === 'true') return mockHandle(request, segments.slice(1));
  return handleRealApi(request, segments);
}
