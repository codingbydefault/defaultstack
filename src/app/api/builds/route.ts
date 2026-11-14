import { buildDirectory, listBuilds } from '@/lib/build-store';
export const dynamic = 'force-dynamic';
export async function GET() {
  const directory = buildDirectory();
  if (!directory) return Response.json({ error: 'Build logs are private. Enable local build log access on your private dashboard first.' }, { status: 503 });
  try { return Response.json({ builds: await listBuilds(directory) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Could not read build history.' }, { status: 500 }); }
}
