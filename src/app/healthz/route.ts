export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'ok', service: 'defaultstack-dashboard' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
