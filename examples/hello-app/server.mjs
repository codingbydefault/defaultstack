import http from 'node:http';
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', app: 'hello-defaultstackr' }));
  }
  if (req.url !== '/') { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>DefaultStackr test deploy</title><body style="background:#0b1020;color:#edf3ff;font:20px system-ui;padding:10vw"><p>DEFAULTSTACKR · SELF HOSTED</p><h1>Your first app is running.</h1><p>Built and deployed on your own server.</p><a style="color:#94b8ff" href="/healthz">Check health</a></body></html>');
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
