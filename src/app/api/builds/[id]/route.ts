import { BUILD_ID, buildDirectory, readBuild, readLogTail } from '@/lib/build-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const directory = buildDirectory();
  if (!directory) return Response.json({ error: 'Build log access disabled.' }, { status: 503 });
  const { id } = await context.params;
  if (!BUILD_ID.test(id)) return Response.json({ error: 'Invalid build ID.' }, { status: 400 });
  try {
    const build = await readBuild(directory, id);
    let log = { text: 'Build output has not been written yet.', truncated: false };
    try { log = await readLogTail(directory, id); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    return Response.json({ build, log }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Build not found or unreadable.' }, { status: 404 }); }
}
