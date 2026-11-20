# DefaultStackR technical audit

Audit date: 20 November 2026.  
Workspace: `codingbydefault/defaultstack` at `5191ae7` (main, “Merge pull request #11 from codingbydefault/codex/project-logs”).  
This branch adds the database-editor session gate described in [Remediation in this branch](#remediation-in-this-branch). It does not deploy, migrate, or change billing.

A same-day follow-up, [Update CBD-20261120-004](#update-cbd-20261120-004), rechecked `b5107ab` after that gate landed. It adds dependency, header, Lighthouse, and smoke-test results. The sections below are the earlier pass and stay as written.

Labels: **VERIFIED** means observed in source, command output, or a live HTTP response during this audit. **INFERRED** means a conclusion from that evidence, not a direct observation. Prices below are copied from `src/lib/billing/catalog.json`. None were invented, and none are charged today.

## Repositories

| Repository | Access | What it is |
| --- | --- | --- |
| `codingbydefault/defaultstack` | Local checkout. Public. | Next.js 15 console, marketing site, deploy scripts. This audit’s build and tests ran here. |
| `codingbydefault/defaultstackr-api` | **VERIFIED** readable through the GitHub API (private, JavaScript, default branch `main`, pushed 19 November 2026). `git clone` and `gh repo clone` both failed with “repository not found” using this environment’s git credentials. | Express 5 control plane: API keys, projects, deploys, domains, encrypted env vars. Package name is still `supabase_clone_api`. |
| `codingbydefault/defaultstackr-smoke-test` | **VERIFIED** cloned and tested. Public. | Small Node app (Neon Snake) used to exercise a GitHub push and a platform deploy. No keys, payments, or database. |
| `codingbydefault/supabase_clone_api` | **VERIFIED** via the GitHub API: private repository with no commits. | Empty. Not a second backend. |

API tests and `npm install` inside `defaultstackr-api` were **not run**. Claims about that repo come from file reads.

## Current state

DefaultStackR is an operator-centric hosting console, not yet a multi-tenant commercial platform.

**VERIFIED** in this repo:

- Marketing pages (`/`, `/prijzen`, `/privacy`, `/voorwaarden`) and a Dutch console at `/app`.
- The browser talks to same-origin `/api/stack/v1/...`. The Next server adds `Authorization: Bearer ${DEFAULTSTACKR_API_KEY}` and, for a customer session, `X-Defaultstackr-User-Id`. The API key is not a `NEXT_PUBLIC_` variable.
- `DEFAULTSTACKR_MOCK=true` serves in-memory sample projects. Customers are refused in mock mode (`503`).
- Customer accounts use Better Auth when `DEFAULTSTACKR_AUTH_DATABASE_URL` and `DEFAULTSTACKR_AUTH_SECRET` are set. The admin console is one shared scrypt password and an HMAC cookie `ds_session` (`sub: 'admin'`).
- There is no `.github` workflow, no ESLint config, and no separate typecheck script. `npm run lint` is `tsc --noEmit`.

**VERIFIED** in `defaultstackr-api`:

- Bind default `127.0.0.1:3000`. `GET /health` is public. Everything else except `POST /api/github/webhook` requires an API key (`admin` or `service`).
- Projects, deployment queue, domain checks, Cloudflare custom hostnames, Nginx via a fixed sudo helper, and an AES-256-GCM env vault exist.
- Customer deploys and rollbacks are rejected while `X-Defaultstackr-User-Id` is set: `Publieke deploys wachten op gescheiden build-omgevingen` (`src/routes/projects.js`).
- Creating a project counts toward a hard cap of 3 only when that header is present (`src/services/projectService.js`). An admin key with no header bypasses the cap. Pro and Business limits are not read from the catalog.
- GitHub `push` webhooks queue a deploy only for projects with `owner_user_id IS NULL` (`src/routes/githubWebhook.js`). The signature check fails closed when the webhook secret is missing.
- Per-project Postgres is a manually configured `DEFAULTSTACKR_PROJECT_DB_<SLUG>_URL`. SQL migrations run with `client.query(migration.sql)` against that database. There is no automatic database provisioning and no Stripe code.

**INFERRED:** the production API behind `api.defaultstackr.cloud` is this Express app. The live response uses Helmet-style CSP and `ratelimit-policy: 300-in-1min`, which matches `src/app.js`. This audit did not log into the host or read production environment variables.

## Architecture

```text
Browser
  → Next.js (port 3100, this repo)
      → /api/stack          Bearer admin API key + optional user id header
      → /api/github         GitHub App OAuth; token sealed in an httpOnly cookie
      → /api/data           opt-in proxy to DATABASE_API_URL (admin session required)
      → site Postgres       Better Auth, reviews, pageviews
  → Express API (port 3000, defaultstackr-api)
      → platform Postgres
      → PM2 worker: git clone, npm/pnpm build, health check, on the same machine
      → Cloudflare tunnel / DNS / custom hostnames
      → Nginx on 127.0.0.1, ports 4000–4999 for apps
```

The dashboard contract in `src/lib/api/contract.ts` still says the Express project routes do not exist and describes a `/v1` API. **VERIFIED stale.** `src/lib/api/real-store.ts` already calls `/api/projects/...` on the Express app. `src/lib/api/upstream.ts` is unused.

Builds are not containers. `defaultstackr-api` has no Docker usage. A separate `deploy/apps/deploy.sh` in this repo describes a Docker test app; the API worker path is git + PM2. **VERIFIED** from both trees. Which path the home server actually runs was not inspected on the machine. **INFERRED** from the live API existing: the Express control plane is what backs `api.defaultstackr.cloud`.

## Build, lint, and tests

Environment: Node `v22.23.4`, npm `10.9.9`. Commands were run in this checkout after `npm ci` (70 packages, `found 0 vulnerabilities`).

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0. |
| `npx tsc --noEmit --pretty false` (`npm run lint`) | Exit 0. No separate typecheck script. |
| `npm run build` | Exit 0. Next.js 15.5.29 compiled, 10 static pages generated, “Standalone server is ready in .next/standalone.” |
| `npm test` | Exit 0. Three lines: platform snapshot test, dashboard mock test, database-editor auth test. |

`npm test` starts the already-built standalone server. It does not compile. A clean machine must build first.

`defaultstackr-smoke-test` (**VERIFIED**, cloned to a temp directory, not part of this PR): `npm test` passed 6 tests; `npm run build` (`node --check` on three files) exited 0; there is no lint script.

`defaultstackr-api`: not installed or tested here.

## Deployment

**VERIFIED** from `deploy/README.md` and `next.config.ts`:

- Intended production is a home Ubuntu host, LAN address documented as `192.168.2.69`. Cloudflare Tunnel terminates TLS. Nginx on `127.0.0.1:80` routes `www` to Next on `127.0.0.1:3100` and `api` to Express on `127.0.0.1:3000`. Ports 80 and 443 stay closed. `output: "standalone"` plus PM2.
- Vercel is documented as a fallback if DNS is pointed back.

**VERIFIED** live on 20 November 2026, headers only:

| Host | Response |
| --- | --- |
| `https://www.defaultstackr.cloud/` | `200`, `server: cloudflare`, Next prerender headers, no `x-vercel-id`. Title “DefaultStackr — Bouw. Beheer. Groei.” |
| `https://defaultstackr.cloud/` | `301` to `https://www.defaultstackr.cloud/`. |
| `https://defaultstackr.nl/` and `https://defaultstackr.online/` | `200` from `server: Vercel`, same title. Not a redirect. |
| `https://www.defaultstackr.nl/` and `https://www.defaultstackr.online/` | `308` to the matching apex, from Vercel. |
| `https://api.defaultstackr.cloud/` | `401` JSON, Helmet-style CSP, rate limit 300 per minute. |

**INFERRED:** `www.defaultstackr.cloud` is the Cloudflare path in front of the self-hosted Next app, because the response has no Vercel id. The home server itself was not inspected.

**VERIFIED** code bug, visible in production for the Vercel-hosted names: `src/middleware.ts` redirects `defaultstackr.nl` and `defaultstackr.online` to `www.defaultstackr.cloud`, but `config.matcher` is only `/app`, `/app/:path*`, and `/api/stack/:path*`. A request to `/` never enters that function. Widening the matcher would also change the Vercel fallback the README describes, so this audit does not change it.

No GitHub Actions deploy this repo. Release is `git pull` plus `deploy/setup.sh` / `deploy/update.sh` on the host. **VERIFIED** by absence of `.github` workflows and by those scripts.

## Database

Two different databases are easy to mix up.

1. **Platform Postgres** used by the Express API and, when configured, by this Next app for Better Auth, reviews, and pageviews (`DEFAULTSTACKR_AUTH_DATABASE_URL`, `src/lib/site-db.ts`). API migrations `001`–`007` cover API keys, encrypted env vars, projects/deployments/domains, customer ownership, Better Auth tables, reviews/pageviews, and operations. **VERIFIED** from the API tree. Not applied from this audit.
2. **Per-project databases** are not provisioned. The migration route forwards SQL to the API, which runs it on a URL the operator set. The sample RLS migration in `database/migrations/0001_projects_rls.sql` is explicitly a foundation for a separate test database. It is not wired to the console.
3. **Table editor** (`/api/data/users|products`) proxies `DATABASE_API_URL`. It is unmounted in `/app`. It does not send the admin API key, so the live API (which requires a key) still rejects it. **VERIFIED** in `route.ts` and by the live `401`.

## Auth

| Actor | Mechanism | What it can do |
| --- | --- | --- |
| Anonymous | None | Marketing pages, health, review submit (origin allowlist), analytics collect (hostname must match a project domain). |
| Admin | Shared password → HMAC `ds_session` for 7 days, httpOnly, `Secure` in production. | Full stack proxy with the admin API key and **no** user-id header, so the API treats the call as the operator. |
| Customer | Better Auth session cookie. | Same admin API key, plus `X-Defaultstackr-User-Id`. Isolation depends entirely on the API honoring that header. |

**VERIFIED** gaps:

- Any holder of the admin API key may set `X-Defaultstackr-User-Id` to any id matching `^[A-Za-z0-9_-]{1,128}$` (`actorContext.js`). The API does not check a customer session. The Next app is the only intended caller. A leaked `DEFAULTSTACKR_API_KEY` is full operator access, including impersonation.
- Middleware treats the presence of a Better Auth cookie as enough to skip the login redirect. Route handlers call `portalIdentity()`, which does validate the admin HMAC and asks Better Auth for the customer. The cookie check in middleware is a hint, as its comment says.
- Admin login rate limit is an in-memory map (8 attempts per minute per address) and resets on process restart.
- GitHub tokens for the admin are sealed with AES-256-GCM using a key derived from `DEFAULTSTACKR_SESSION_SECRET`. Customer GitHub tokens stay in Better Auth. OAuth `state` is checked on the callback.
- There are no team roles. `docs/billing-and-access.md` describes owner/admin/developer/reader. The running model is one shared admin plus optional customer ownership.

## Capability matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| App hosting (Next and similar) | Partial | API worker clones a public GitHub HTTPS URL, builds, and starts under PM2 on the same host. Customer-triggered deploys return 403. |
| GitHub integration | Partial | OAuth and a file editor in this repo. Webhook deploys only ownerless projects. Private-repo deploy keys are not part of the webhook queue. |
| Build pipelines and logs | Partial | One worker queue, build logs, runtime logs. No separate CI product. |
| Managed PostgreSQL | Missing as a product | Manual connection string plus a SQL migration endpoint. No provision, no backup per project, no connection string issued to the customer. |
| Env vars | Implemented for operators | Ciphertext at rest, masked HTTP responses, CLI export. Dashboard shows bullets, not values. |
| Project dashboard | Implemented | `/app` and `/app/projects/[id]`, mock or live API. |
| Team dashboard | Missing | Mock owner labels only. No invites or roles. |
| Custom domains and SSL | Partial | Domain records, TXT check, Cloudflare hostname, Nginx, tunnel manifest. Universal SSL for `*.defaultstackr.cloud` is documented. Customer projects still cannot deploy. |
| Auth | Partial | Admin password plus Better Auth. Not organization-scoped. |
| Subscriptions and billing | Not live | Catalog and pricing page only. Profile copy says no payment happens. API has no Stripe code. `scripts/stripe/sync-catalog.mjs` refuses to create Checkout sessions. |
| Usage limits | Partial and inconsistent | API enforces 3 projects for a customer header only. Catalog also lists Pro 10 and Business usage extras. The Next app does not enforce either. |
| Secure API | Partial | Hashed API keys, Helmet, CORS allowlist, rate limit, secret redaction, command argv checks (`shell: false`). Trust boundary is the shared admin key. |
| Mail product | Placeholder | `/app/mail`. Catalog lists mailbox limits. No mail implementation found. |

### Documented prices (not charged)

From `src/lib/billing/catalog.json`, version `2026-11`, currency `eur`. **VERIFIED** as file contents. **Not verified** as live Stripe prices, and checkout is not implemented.

| Plan | Monthly | Yearly | Active projects | Database |
| --- | ---: | ---: | ---: | ---: |
| Free | €0 | €0 | 3 | 2 GB |
| Pro | €29 (`2900` cents) | €290 (`29000` cents) | 10 | 5 GB |
| Business | €59 (`5900` cents) | €590 (`59000` cents) | 10 included | 5 GB included |

Business extras in the same file: €5 per extra project per month (`500` cents) and €2 per extra GB per month (`200` cents). `docs/billing-and-access.md` states the same figures, says amounts are ex VAT, and says paid subscriptions are not live. Stripe product and price ids are recorded in that file. This audit did not call Stripe.

## Critical issues

1. **Shared admin key is the customer boundary. VERIFIED.** A customer session causes this server to call Express with the operator key. The API trusts `X-Defaultstackr-User-Id` from any admin key. Leakage of `DEFAULTSTACKR_API_KEY` is takeover of every project, plus impersonation. This was not changed here: fixing it changes the authorization model.
2. **Customer code is blocked, and that block is load-bearing. VERIFIED.** `operatorOnly` exists because builds run on the platform host. Removing it without an isolated runner would execute customer repositories as the deploy user.
3. **Database editor had no session check. VERIFIED on `5191ae7`.** `ENABLE_LOCAL_DATABASE_EDITOR` defaults off, the UI is unmounted, and the proxy does not send an API key. If the flag is on and `DATABASE_API_URL` points at anything that does not require a key, anonymous callers could read and write `users` and `products`. Closed in this branch. See below.
4. **Free cap is not the catalog. VERIFIED.** The number 3 is hardcoded and skipped for operator calls. Pro and Business are not enforced. Do not turn on Checkout until metering matches `docs/billing-and-access.md`.
5. **Arbitrary SQL on the project database. VERIFIED.** Admin-only, 64 KiB, not parameterized. Acceptable only while customers cannot reach it. The dashboard already posts SQL through `/api/stack`.
6. **Canonical-host redirect does not run for `/`. VERIFIED** in `src/middleware.ts` and by the live Vercel 200s on `.nl` and `.online`.
7. **Stale security comments. VERIFIED.** `contract.ts` says the project API does not exist. The API root still says “My Supabase Clone API is running!”.
8. **No CI. VERIFIED.** Regressions depend on someone running `npm test` after a build.
9. **Secrets in git. Not found.** `.env.example`, Cloudflare examples, and tests use placeholders. `npm ci` reported 0 vulnerabilities. This is not a secret scan of the home server or of Git history beyond the working tree.
10. **Single machine. VERIFIED as the documented design.** Builds, Postgres, Nginx, the tunnel, and the API share one host. That host is the main cost and the main outage domain. The LAN address was not probed.

## Infrastructure and cost drivers

**VERIFIED** from code and docs, not from invoices:

- One Ubuntu host (CPU and disk for customer builds once those are allowed; today mostly the operator’s own apps).
- PostgreSQL on localhost (platform database, plus one database per project if the operator creates them).
- Cloudflare: tunnel, DNS, Universal SSL, and optional custom-hostname API calls. Domains `defaultstackr.nl`, `defaultstackr.online`, and `defaultstackr.cloud` exist in code and answer on HTTPS.
- PM2 process set: Next, API, deploy worker, optional backup timer, monitor, Telegram bot.
- Vercel: currently serving `.nl` and `.online`. Cost depends on that account’s plan. Not measured.
- Stripe: catalog script only. No subscription revenue path in code.
- GitHub: OAuth app and webhooks. No GitHub Actions minutes in this repo.
- Egress for `git clone` and health checks.

No container cluster, no per-tenant VM, no usage meter that could produce a variable cloud bill. The cost of a future “managed Postgres” or isolated build fleet is not in the current design.

## Remediation in this branch

`/api/data/[table]/[[...id]]` now returns 401 unless `ds_session` verifies as the admin, and 403 when a mutation’s `Origin` does not match the host. Anonymous requests are rejected before `DATABASE_API_URL` is called. A customer cookie is not accepted. The feature flag still defaults off. The route still does not attach `DEFAULTSTACKR_API_KEY`, so it does not gain new access to the live API.

`scripts/tests/database-editor.mjs` starts a local upstream and the standalone server with the flag on. It checks anonymous and forged cookies, a fake Better Auth cookie, cross-site POST, an invalid table, and an authenticated POST. `npm test` passed, including the two existing suites.

## Update CBD-20261120-004

Date: 20 November 2026. Base: `b5107ab` (“Require an admin session for the database editor. (#12)”).  
Task: recheck outdated and vulnerable dependencies, framework versions, build health, live security headers, bundle size, Lighthouse, accessibility, and `codingbydefault/defaultstackr-smoke-test`. No production deploy, DNS change, secret change, or merge to `main`.

Environment: Node `v22.23.4`, npm `10.9.9`. `npm ci` added 70 packages and audited 71, `found 0 vulnerabilities`.

### Dependencies

`npm audit` and `npm audit --omit=dev` both reported `found 0 vulnerabilities`.

`npm outdated` on `b5107ab`:

| Package | Current | Wanted (in range) | Latest |
| --- | --- | --- | --- |
| `better-auth` | 1.7.25 | 1.7.27 | 1.7.27 |
| `next` | 15.5.29 | 15.5.29 | 16.4.6 |
| `typescript` | 5.9.3 | 5.9.3 | 7.0.2 |
| `@types/node` | 22.20.5 | 22.20.5 | 26.6.6 |

`npm ls --depth=0` also showed React and React DOM `19.3.1`, `pg` `8.23.1`, `@types/react` and `@types/react-dom` `19.3.0`, `@types/pg` `8.23.1`, `@fontsource/onest` `5.3.1`, `@fontsource/outfit` `5.3.0`. `npm view` `dist-tags.latest` matched those except where a newer major exists (table above). `npm ls postcss` showed `postcss@8.5.33 overridden`, and `npm view postcss version` was `8.5.33`.

Registry lines, from `npm view`:

- `next` dist-tag `backport` is `15.5.29` (installed). dist-tag `latest` is `16.4.6`.
- `typescript` `5.9.3` is the newest 5.x. `6.0.3` and `7.0.2` also exist. dist-tag `latest` is `7.0.2`.
- `@types/node` newest per major: 22.20.5 (installed), 24.19.2, 25.9.9, 26.6.6.
- `better-auth` `1.7.27` was published `2026-11-20T10:53:10.415Z`. `1.8.0` is still a beta tag in the time metadata, not `dist-tags.latest`.

Safe update opened: [PR #14](https://github.com/codingbydefault/defaultstack/pull/14) (`better-auth` `^1.7.25` to `^1.7.27`). `src/lib/auth/customer.ts` uses email/password plus optional GitHub and Google. It does not set a custom JWT `getJwks` adapter or OAuth-provider `originBoundFields`, which are the action-required notes on the 1.7.26 and 1.7.27 GitHub releases. After install: `npm audit` still 0 vulnerabilities. `npm run lint`, `npm run build`, and `npm test` exited 0 on that branch.

Majors not installed:

- **Next.js 16.4.6.** The [upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) removes synchronous `cookies` / `headers` / `params` / `searchParams`, renames `middleware` to `proxy`, and makes Turbopack the default. This repo has `src/middleware.ts`. Route handlers checked in this pass already `await` those APIs. A codemod was not run.
- **TypeScript 6.0.3 and 7.0.2.** Next.js documents that TypeScript 7 does not provide the JavaScript compiler API. This repo’s lint script is `tsc --noEmit`. Not installed on Next 15.5.29.
- **`@types/node` 24, 25, and 26.** This audit ran on Node `v22.23.4`. `engines` is `>=20`. Newer type majors were not installed.

npm printed that CLI `12.2.3` exists. That is the machine’s npm, not a dependency in `package.json`. It was not changed.

### Build health on `b5107ab`

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0. 0 vulnerabilities. |
| `npm run lint` | Exit 0. |
| `npm run build` | Exit 0. Next.js 15.5.29, 10 static pages, “Standalone server is ready in .next/standalone.” |
| `npm test` | Exit 0. Platform, dashboard, and database-editor lines. |

No `.github` workflows. Remote checks on the new PRs are Vercel preview builds, not GitHub Actions.

### Live security headers

`curl -sSI` on 20 November 2026, about 11:31 UTC. There is still no `vercel.json`. `next.config.ts` on `b5107ab` sets `poweredByHeader: false` and no `headers()`.

| Header | `defaultstackr.nl` | `defaultstackr.online` | `www.defaultstackr.cloud` | `defaultstack.vercel.app` |
| --- | --- | --- | --- | --- |
| Status | 200, `server: Vercel` | 200, `server: Vercel` | 200, `server: cloudflare`, `cf-ray` present, no `x-vercel-id` | 200, `server: Vercel` |
| CSP | absent | absent | absent | absent |
| HSTS | `max-age=63072000` | `max-age=63072000` | absent | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | absent | absent | absent | absent |
| `X-Content-Type-Options` | absent | absent | absent | absent |
| `Referrer-Policy` | absent | absent | absent | absent |
| `Permissions-Policy` | absent | absent | absent | absent |
| `X-Powered-By` | absent | absent | absent | absent |

Vercel document responses also sent `access-control-allow-origin: *`. The standalone server’s `/` response did not. This repo does not set that header on the homepage. `src/app/api/reviews/route.ts` does set `Access-Control-Allow-Origin: *` on the reviews JSON. `src/app/api/customer-entry/status/route.ts` echoes only an allowlisted origin.

[PR #13](https://github.com/codingbydefault/defaultstack/pull/13) adds nosniff, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, a permissions policy, and a same-origin CSP (`script-src` and `style-src` keep `'unsafe-inline'` because the live homepage contains inline scripts; `connect-src` and `form-action` also allow `https://www.defaultstackr.cloud`). HSTS `max-age=63072000` is sent only for host `www.defaultstackr.cloud` and `defaultstackr.cloud`, so it does not sit in front of Vercel’s stronger `vercel.app` header. `includeSubDomains` is omitted so this header does not pin `*.defaultstackr.cloud`. Local `curl` on the standalone server showed those headers on `/`, `/prijzen`, and the `/app` redirect. Headless Chrome loaded the local homepage with no Content-Security-Policy console error. Production URLs were not deployed, so the live table above is unchanged.

### Performance

Next.js 15.5.29 build table on `b5107ab` (the table’s sizes are the build report, not a second compressor run): `/` is 4.56 kB with 122 kB first-load JS. Shared first-load JS is 103 kB (`1255-….js` 46.6 kB, `4bd1b696-….js` 54.2 kB, other 1.94 kB). Largest route first load is `/app/projects/[id]` at 131 kB. Raw files under `.next/static`, largest first: `framework-….js` 219012 bytes, `1255-….js` 174134, `4bd1b696-….js` 173020, `main-….js` 129008, `polyfills-….js` 112594.

Lighthouse 13.6.0, mobile form factor (412×823), headless Chrome, 20 November 2026. Performance category:

| URL | Score | FCP | LCP | TBT | CLS | Speed index | TTI |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `https://defaultstackr.nl/` | 100 | 1.0 s | 1.0 s | 50 ms | 0 | 1.2 s | 2.7 s |
| `https://defaultstackr.online/` | 100 | 0.9 s | 0.9 s | 90 ms | 0.002 | 1.2 s | 2.6 s |
| `https://www.defaultstackr.cloud/` | 99 | 1.4 s | 1.4 s | 50 ms | 0.002 | 2.9 s | 3.1 s |
| `https://defaultstack.vercel.app/` | 100 | 0.9 s | 0.9 s | 40 ms | 0.002 | 0.9 s | 2.1 s |

### Accessibility

Live HTML for all four URLs: `<html lang="nl">`, one `<img>` (`/stripe-wordmark-white.svg`, `alt="Stripe"`), form controls wrapped in `<label>` or given `aria-label`. Lighthouse accessibility score was 97 on each URL. Passing axe-linked audits included `image-alt`, `html-has-lang`, and `label` (Lighthouse 13.6.0 points at axe-core 4.14 rule docs). A separate axe CLI was not run.

Two audits scored 0 on every URL:

- `link-in-text-block`: `<a href="/privacy">` contrast 1.65:1 against surrounding text (link `#424a58`, text `#626b77`; minimum cited 3:1).
- `label-content-name-mismatch`: `<a class="brand" aria-label="DefaultStackr, naar home">`. The visible text includes “by CodedByDefault”, which is not in the accessible name (`src/app/page.tsx`).

Not changed in this pass. Both are visual or copy changes, not the header or patch updates.

### Smoke-test repo

`codingbydefault/defaultstackr-smoke-test` cloned read-only to a temp directory. HEAD `b522d5e10cb1daccbd3a020230c5761e2bf28e93` (19 November 2026, “Use Space to restart Snake and arrow keys to steer”). No runtime dependencies. `npm ci` audited 1 package, 0 vulnerabilities. `npm outdated` printed nothing. `npm run build` (`node --check` on `server.mjs`, `public/game.js`, `public/game-core.mjs`) exit 0. `npm test` passed 6 tests, 0 failed. `server.mjs` sends `X-Content-Type-Options: nosniff` on health, version, and asset responses. `public/index.html` has `lang="nl"`, no `<img>`, and the canvas has `role="img"` plus `aria-label="Snake speelveld"`. No pull request was opened against that repo. It was not opened in a browser. **Niet geverifieerd** as a deployed URL.

### Not verified

- Live headers after PR #13. Not merged and not deployed. Cloudflare was not reconfigured, so it is also **niet geverifieerd** whether the edge will forward the new origin HSTS once the home server runs that build.
- `defaultstackr-api` was not cloned again. The earlier section still stands.
- The home Ubuntu host was not logged into.
- Vercel preview for [PR #13](https://github.com/codingbydefault/defaultstack/pull/13) succeeded (check “Vercel” on that PR). The Vercel preview for [PR #14](https://github.com/codingbydefault/defaultstack/pull/14) was still running when this section was committed. Local lint, build, and tests on both branches had already exited 0. There is no GitHub Actions workflow in this repo.
