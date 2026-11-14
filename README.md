# DefaultStackr by CodedByDefault

A Next.js Cloud Gradient landing page with a separate platform preview.

## Routes
- `/` public landing page, the entry point for all new visitors.
- `/app` platform preview, not yet a working client application.

## Run locally

```bash
npm install
npm run dev
```

The dev server uses port **3100** so it does not clash with the Express API on port 3000. Production uses the same port.

## Windows & Ubuntu workflow

On Windows PowerShell:

```powershell
cd C:\Projects
git clone https://github.com/codingbydefault/defaultstack.git
cd defaultstack
npm install
code .
npm run dev
```

On Ubuntu:

```bash
git clone https://github.com/codingbydefault/defaultstack.git
cd defaultstack
npm install
npm run dev
```

To retrieve new commits: `git pull --ff-only`. After edits: `git add .`, `git commit -m "Explain change"`, and `git push origin main`. For bigger features, create a separate branch and PR. Never commit `.env` secrets.

## Vercel setup
Import the repository as a Next.js project. Add `www.defaultstackr.online` and `defaultstackr.online`; use the www domain as canonical, redirect the apex domain. Use the exact DNS records provided by Vercel. Vercel stays available as a fallback if DNS is pointed back at those records.

## Self-hosting on Ubuntu
The production path for the home server is documented in Dutch in [deploy/README.md](deploy/README.md). That machine is `192.168.2.69` on the LAN. Cloudflare Tunnel is the primary path: TLS ends at Cloudflare, and Nginx on `127.0.0.1:80` routes `www`, the apex redirect, `api`, and other subdomains. The Next.js app listens on `127.0.0.1:3100`. Ports 80 and 443 stay closed. `MODE=direct` is the alternative with public ports and Let's Encrypt.

## Backend integration
The Ubuntu Express API responds on port 3000 locally. In production, Nginx reaches it at `api.defaultstackr.online` and the process should bind to `127.0.0.1` only. A Windows SSH tunnel forwarding port 3001 is for local development only; a Vercel deployment cannot reach the private `localhost:3001` URL. Secure the backend before exposing any API publicly. Do not expose PostgreSQL to the internet.

There is currently no real hosting, authentication, database management or billing on this site.
## Private database table editor

`/app` now provides Users and Products tables, search over loaded records, insert,
edit, and confirmed deletion. Data goes through Next.js server routes to the
existing Express API; PostgreSQL credentials never enter the browser.

On the home Ubuntu machine, copy `.env.example` to `.env.local`, set
`DATABASE_API_URL=http://127.0.0.1:3000` and set
`ENABLE_LOCAL_DATABASE_EDITOR=true` **only for private network use**. Restart
Next.js after changing environment variables. Keep this option false on public
hosting: the editor is disabled by default because account authentication and
project permissions have not been implemented. CORS is not authentication.

Start Express separately, then run this frontend on port 3100. The API must
implement GET/POST `/api/users` and `/api/products`, and PATCH/DELETE
`/api/users/:id` and `/api/products/:id`. IDs currently must be numeric. Reads
currently load the entire table; pagination is a later backend change.

In Express, load `require('dotenv').config()` **before** requiring the database
configuration, so the pool receives environment variables during initialization.
The backend code lives separately and is not modified by this repository.

This is a record editor for two existing tables, not yet database provisioning,
user authentication, app deployment, or a complete Supabase/Vercel replacement.

## Eerste eigen app, migraties en RLS

Zie [testdeployment](deploy/apps/README.md) voor de Docker-testapp met healthchecks
en herstel bij een mislukte start. Zie [databasebasis](database/README.md) voor
transactionele SQL-migraties en een RLS-voorbeeld met eigenaarisolatie.
De serverconfiguraties gebruiken nu de aangekochte naam defaultstackr.online.
De publieke Nginx-API-route geeft voorlopig 404: Express heeft nog geen login.
Bestaande geïnstalleerde serverconfiguraties veranderen pas na expliciet toepassen.

## Workspace dashboard

`/app` combines the DefaultStackr overview, real application status, deployment
command preparation, table editor, migration/RLS guidance and connection settings.
The deployment dialog prepares an Ubuntu command; it does not execute Docker from
the browser. Read-only metadata is exported with `node deploy/apps/export-status.mjs`.
Set `DEFAULTSTACK_STATE_DIR` in `.env.local` and restart Next.js. Never give the
web process Docker group membership. Without a snapshot the dashboard shows an
honest disconnected state. Snapshots older than two minutes are marked stale.
The deploy script exports automatically after success; periodic refresh on the
server is not configured yet. GitHub integration and account auth remain pending.
