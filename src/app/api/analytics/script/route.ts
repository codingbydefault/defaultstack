export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const project = new URL(request.url).searchParams.get('project');
  if (!project || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(project)) return new Response('Ongeldig project.', { status: 400 });
  const script = `(()=>{const path=location.pathname;fetch('https://www.defaultstackr.cloud/api/analytics/collect',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({project:${JSON.stringify(project)},path}),mode:'cors',credentials:'omit',keepalive:true}).catch(()=>{});})();`;
  return new Response(script, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
