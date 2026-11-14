# DefaultStack by CodedByDefault

A Next.js Cloud Gradient landing page with a separate platform preview.

## Routes
- `/` public landing page, the entry point for all new visitors.
- `/app` platform preview, not yet a working client application.

## Run locally

```bash
npm install
npm run dev
```

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
Import the repository as a Next.js project. Add `www.defaultstack.online` and `defaultstack.online`; use the www domain as canonical, redirect the apex domain. Use the exact DNS records provided by Vercel.

## Backend integration
The Ubuntu Express API responds on port 3000 locally. A Windows SSH tunnel forwarding port 3001 is for local development only; a Vercel deployment cannot reach the private `localhost:3001` URL. Secure the backend before exposing any API publicly. Do not expose PostgreSQL to the internet.

There is currently no real hosting, authentication, database management or billing on this site.