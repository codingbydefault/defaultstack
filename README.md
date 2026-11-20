# DefaultStackr by CodedByDefault

A Next.js Cloud Gradient landing page with a separate platform preview.

## Routes
- `/` public landing page, the entry point for all new visitors.
- `/app` beheerconsole. Zonder geldige sessie volgt een redirect naar `/app/login`.
- `/app/login` beheerlogin met een httpOnly-sessiecookie.

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
Import the repository as a Next.js project. Add `www.defaultstackr.cloud` and `defaultstackr.cloud`; use the www domain as canonical, redirect the apex domain. Use the exact DNS records provided by Vercel. Vercel stays available as a fallback if DNS is pointed back at those records.

## Self-hosting on Ubuntu
The production path for the home server is documented in Dutch in [deploy/README.md](deploy/README.md). That machine is `192.168.2.69` on the LAN. Cloudflare Tunnel is the primary path: TLS ends at Cloudflare, and Nginx on `127.0.0.1:80` routes `www`, the apex redirect, `api`, and other subdomains. The Next.js app listens on `127.0.0.1:3100`. Ports 80 and 443 stay closed. `MODE=direct` is the alternative with public ports and Let's Encrypt.

## Backend integration
The Ubuntu Express API responds on port 3000 locally. In production, Nginx reaches it at `api.defaultstackr.cloud` and the process should bind to `127.0.0.1` only. A Windows SSH tunnel forwarding port 3001 is for local development only; a Vercel deployment cannot reach the private `localhost:3001` URL. Secure the backend before exposing any API publicly. Do not expose PostgreSQL to the internet.

The dashboard calls the Express API for projects, deploys, domains and environment variables. Until those routes exist, set `DEFAULTSTACKR_MOCK=true`. Billing is not implemented. The admin session is one shared password, separate from the API key.
## Beheerconsole, omgeving en mock-modus

`/app` praat alleen met Next.js. De browser krijgt nooit `DEFAULTSTACKR_API_KEY`. Route handlers lezen de variabelen hieronder en sturen `Authorization: Bearer` naar Express. Zet ze in `.env.local` op de server en herstart PM2-app `defaultstackr-web`. Geen van deze namen mag `NEXT_PUBLIC_` worden.

| Variabele | Betekenis |
| --- | --- |
| `DEFAULTSTACKR_API_URL` | Express, op dezelfde machine `http://127.0.0.1:3000`. Later `https://api.defaultstackr.cloud`. |
| `DEFAULTSTACKR_API_KEY` | Admin-sleutel van de API. Alleen op de server. |
| `DEFAULTSTACKR_ADMIN_PASSWORD_HASH` | scrypt-hash van het beheerwachtwoord. |
| `DEFAULTSTACKR_SESSION_SECRET` | Geheim voor het httpOnly-cookie, minstens 16 tekens. |
| `DEFAULTSTACKR_MOCK` | `true` laat de console werken zonder Express, met voorbeeldprojecten en alle DNS-statussen. |
| `DEFAULTSTACKR_EDGE_CNAME` | Optioneel CNAME-doel in mock-modus. Standaard `edge.defaultstackr.cloud`. |
| `DEFAULTSTACKR_EDGE_IPV4` | Optioneel A-record in mock-modus. Standaard het documentatie-adres `192.0.2.40`. |

Hash maken, wachtwoord via stdin:

```bash
printf '%s' 'kies-een-lang-wachtwoord' | node scripts/hash-admin-password.mjs
```

De paden in `src/lib/api/contract.ts` zijn voorlopig. Daar staan TODO-markeringen tot `defaultstackr-api` de project-, deploy-, domein- en env-routes levert. Zet `DEFAULTSTACKR_MOCK` uit zodra die API antwoordt. Een domein kan na de TXT-controle `_defaultstackr-verify.<domein>` maar aan één project hangen.

## Private database table editor

The table editor is no longer mounted in `/app`. Its server route remains for
private-network use: Users and Products, search over loaded records, insert,
edit, and confirmed deletion. Data goes through Next.js server routes to the
existing Express API; PostgreSQL credentials never enter the browser.

On the home Ubuntu machine, copy `.env.example` to `.env.local`, set
`DATABASE_API_URL=http://127.0.0.1:3000` and set
`ENABLE_LOCAL_DATABASE_EDITOR=true` **only for private network use**. Restart
Next.js after changing environment variables. Keep this option false on public
hosting. When it is enabled, the route still requires the admin session cookie
and rejects cross-site mutations. A customer session is not enough, and this
route is not a per-project permission system. CORS is not authentication.

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
De serverconfiguraties gebruiken nu de aangekochte naam defaultstackr.cloud.
De publieke Nginx-API-route geeft voorlopig 404: Express heeft nog geen login.
Bestaande geïnstalleerde serverconfiguraties veranderen pas na expliciet toepassen.

## Workspace dashboard

`/app` is the Dutch admin console: projects, deployments, DNS settings,
environment variables and project settings. The older snapshot view is no longer
mounted there. `/api/platform` still reads a read-only status file when
`DEFAULTSTACK_STATE_DIR` is set. The Docker deploy script and
`node deploy/apps/export-status.mjs` are unchanged and still do not run from
the browser. GitHub login for end users is not part of this admin session.
