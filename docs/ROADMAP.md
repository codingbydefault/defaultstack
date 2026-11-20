# DefaultStackR roadmap

Source: [AUDIT.md](./AUDIT.md), 20 November 2026.  
This document does not change prices, permissions, or production. Prices, when mentioned, are the figures already in `src/lib/billing/catalog.json`.

## Score

Each item is scored 1–5. Higher is better. Effort uses the inverse: 5 is a small change, 1 is a large one.

`score = 0.30×business value + 0.25×engineering impact + 0.20×urgency + 0.15×effort + 0.10×strategic relevance`

| Rank | Item | Business | Engineering | Urgency | Effort | Strategic | Score |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Bind customer identity to a verified session | 5 | 5 | 5 | 2 | 5 | 4.55 |
| 2 | Isolated build runner before any customer deploy | 5 | 5 | 4 | 1 | 5 | 4.20 |
| 3 | Provision per-project Postgres, or stop offering it | 5 | 4 | 3 | 2 | 5 | 3.90 |
| 4 | Enforce the existing Free / Pro / Business caps | 5 | 3 | 3 | 3 | 4 | 3.70 |
| 5 | GitHub push deploys for customer-owned repos | 4 | 4 | 3 | 3 | 4 | 3.65 |
| 6 | Integration test of the stack proxy and user header | 3 | 4 | 4 | 4 | 3 | 3.60 |
| 7 | Stripe subscription state, no new prices | 5 | 3 | 2 | 3 | 4 | 3.50 |
| — | Admin gate on `/api/data` | 2 | 3 | 4 | 5 | 2 | 3.10 |
| 8 | CI for lint, build, and `npm test` | 2 | 4 | 3 | 4 | 3 | 3.10 |
| 9 | Team roles from the billing doc | 3 | 3 | 2 | 2 | 4 | 2.75 |
| 10 | Decide the `.nl` / `.online` canonical redirect | 3 | 2 | 3 | 4 | 2 | 2.75 |
| 11 | Replace stale API comments and the Supabase banner | 1 | 2 | 2 | 5 | 1 | 2.05 |

The table is ordered by score. GitHub customer deploys (rank 5) still wait on the isolated runner (rank 2). The admin gate on `/api/data` is done in this branch and is not a future rank.

## Immediate fixes

### Done in this branch

`/api/data` required no session when `ENABLE_LOCAL_DATABASE_EDITOR=true`. It now requires a valid admin `ds_session` and rejects cross-site mutations. Anonymous callers never reach `DATABASE_API_URL`. Covered by `scripts/tests/database-editor.mjs`.

Left alone on purpose: the route still does not send `DEFAULTSTACKR_API_KEY`. Adding that key would make the editor work against the live API and is a separate, explicit operator change.

### Next, still safe

1. **Proxy integration test (rank 6, score 3.60).** Spin a fake Express in `scripts/tests` and assert that a customer session sends `X-Defaultstackr-User-Id` and that `GET /v1/operations` stays 403. No production calls. This can ship before the higher-scored identity and runner work because it does not change production behavior.
2. **CI (score 3.10).** One workflow: `npm ci`, `npm run lint`, `npm run build`, `npm test`. The test script needs the build output.
3. **Canonical hosts (score 2.75).** `src/middleware.ts` redirects `.nl` and `.online` only on `/app` and `/api/stack`, because of `matcher`. Live `.nl` and `.online` return 200 from Vercel. Confirm whether those names should keep serving the site or should 307 to `www.defaultstackr.cloud` before changing the matcher. The README currently calls Vercel a fallback.
4. **Stale copy (score 2.05).** `src/lib/api/contract.ts` still says the project routes do not exist. The API root still says “My Supabase Clone API is running!”.

## MVP functionality

A sellable MVP is: a customer signs in, creates a project from a GitHub repo, sees a build log, gets a `*.defaultstackr.cloud` URL, sets env vars, and cannot see another customer’s project. Custom domains, teams, mail, and usage billing can follow.

What already exists: console UI, GitHub OAuth, encrypted env vault, domain records, deployment queue, owner column, and a 3-project cap when the user header is set.

What blocks the MVP:

- Customer deploys return 403 until builds are isolated (rank 2).
- Webhooks ignore projects that have an owner (rank 5, after rank 2).
- Per-project Postgres is a manual URL (rank 3). The marketing page should not call it managed until provisioning, a restricted role, backups, and a connection string the customer can rotate exist.
- The Free cap is hardcoded and skipped for the operator key (rank 4).

Acceptance for the MVP:

- Two test customers cannot read or mutate each other’s project, env vars, logs, or SQL.
- A customer deploy of `defaultstackr-smoke-test` reaches `/healthz` on `<slug>.defaultstackr.cloud` without a shell on the platform host.
- Build logs and runtime logs do not contain env values. The API already redacts; the MVP test must keep a fixture secret out of the log body.
- The 4th project for a Free customer returns 409. Pro and Business stay unavailable until their caps are enforced from the catalog.
- `DEFAULTSTACKR_MOCK` is off in production. The console shows an error when the API is down, not sample projects.

## Security requirements

These are gates, not optional polish.

1. **Verified customer identity (score 4.55).** The API must stop accepting a raw `X-Defaultstackr-User-Id` from anyone who holds the admin key. Replace it with a short-lived credential the Next server signs for the user id it just loaded from Better Auth, or with per-user tokens. Operator access stays a separate admin key with no user header. Do not loosen `operatorOnly` as part of this change.
2. **Isolated builds (score 4.20).** Customer `npm install` / build / start must not run as the platform user on the host that stores the master key and Postgres. A container or VM with no Docker socket, no host filesystem, and a locked egress policy is the minimum. The API already refuses customer deploys for this reason.
3. **Secret handling.** Keep the master key, API keys, GitHub client secret, and database URLs off the client and out of git. Env HTTP responses stay masked. Rotation scripts already exist in the API; run them only as an operator action, not from this roadmap’s implementation.
4. **SQL.** Project migrations need a database role that cannot reach the platform database. The sample RLS file is not that control.
5. **Sessions.** Keep the admin cookie httpOnly and signed. Add a durable rate limit before the admin password is exposed beyond the home server. Middleware must not treat cookie presence as authorization; route handlers already re-check.
6. **Webhooks.** Keep the GitHub signature check. Extend it to owned projects only after builds are isolated and the repo URL is bound to that installation.
7. **Headers and TLS.** Cloudflare Full mode and localhost-only Postgres stay as documented. Do not open 3000, 3100, or 5432 on the public internet.

Out of scope until the gates above exist: public signup that can deploy, Checkout, and team invites.

## Architecture improvements

- Split the operator key from the portal key. The portal credential can act only as a signed user. The operator key is used from the host, not from customer requests.
- One HTTP contract. Delete or rewrite the `/v1` TODO in `contract.ts` so it matches `/api/projects`, which `real-store.ts` already calls.
- A real queue metric: worker heartbeat is sketched in the API operations snapshot. Surface a failed worker in `/app/admin` only after the snapshot cannot leak secrets (the platform test already strips a `secret` field).
- Per-project Postgres, if it stays in the product: create the database and role in a transaction, store the URL in the env vault, and run migrations as that role. Until then, the UI should say the database is not provisioned.
- Move `.nl` and `.online` DNS on purpose. Today they hit Vercel; `.cloud` hits Cloudflare. Two origins will drift.

## Dependencies

| Work | Depends on |
| --- | --- |
| Customer GitHub deploys | Isolated runner, webhook secret, repo bound to the installation |
| Custom domains for customers | A deploy that has a port to route, plus the existing TXT and Cloudflare checks |
| Pro / Business enforcement | Catalog as the only source of caps; a usage table; no Checkout yet |
| Stripe | Caps and a spending limit the customer has accepted; idempotent webhooks. Do not add prices that are not already in the catalog |
| Teams | Signed customer identity, then the role table in `docs/billing-and-access.md` |
| Database editor against the live API | This branch’s admin gate, then an explicit decision to attach the server API key |
| CI | None |

External systems: GitHub App (contents read/write is already required for the editor), Cloudflare API token for custom hostnames, platform Postgres, and the home host. Stripe and mail are not required for the MVP.

## Commercial priorities

Do not sell Pro or Business until the cap in the catalog is the cap in the API. The Free tier can be the public MVP: 3 projects, 2 GB database, €0, as already written. The API’s current “3 projects” check is a start and only applies to customer-header calls.

Sequence:

1. Close the identity and build-isolation gates.
2. Ship Free as a working deploy of a public GitHub repo, with logs and env vars.
3. Meter active projects and database size the way `docs/billing-and-access.md` already describes. Show the numbers before charging.
4. Only then attach the existing Pro and Business Stripe prices. The sync script must keep refusing to create Checkout sessions until that meter exists. Do not add the missing Business usage prices in Stripe before the meter and the spending-limit rule in that same doc.
5. Teams and mail after a paying plan actually gates capacity. Mail is a catalog line with no product behind it.

Acceptance for taking money:

- A Free user cannot exceed 3 active projects or 2 GB, and is not billed.
- A Pro subscription, once enabled, maps to the catalog’s 10 projects and 5 GB, not to a second hardcoded number.
- Failed payment does not delete data. It stops new deploys. The billing doc already says existing apps stay up when a spending limit is hit; follow that.
- Browser redirects never grant a plan. Only a verified Stripe webhook does.

## Update CBD-20261120-004

Source: the [update section](./AUDIT.md#update-cbd-20261120-004) in `AUDIT.md`, same day, base `b5107ab`. This does not change the scores above. The database-editor gate those scores already mark as done is on `main`.

Shipped as pull requests, not merged and not deployed:

1. [PR #13](https://github.com/codingbydefault/defaultstack/pull/13) — response headers. Closes the live gap recorded in the update (no CSP, no framing header, no nosniff, no referrer policy, no permissions policy on the four public URLs; no HSTS on `www.defaultstackr.cloud`). HSTS is limited to the `.cloud` hosts so Vercel’s existing header, including `includeSubDomains; preload` on `defaultstack.vercel.app`, stays the one browsers keep.
2. [PR #14](https://github.com/codingbydefault/defaultstack/pull/14) — `better-auth` 1.7.25 to 1.7.27. The only in-range outdated package. `npm audit` was already clean.

Held back, with the reason in the audit update:

- Next.js 16.4.6 (`middleware` to `proxy`, plus the other breaks in the v16 upgrade guide).
- TypeScript 6.0.3 and 7.0.2.
- `@types/node` 24.19.2, 25.9.9, and 26.6.6 while the runtime used here is Node 22.

Left as findings, not patches: the privacy-link contrast and the home brand link’s accessible name (Lighthouse accessibility 97), and `Access-Control-Allow-Origin: *` on the reviews JSON. Tightening that CORS header can wait until someone checks every page that fetches `/api/reviews` from another host. The canonical-host matcher note in the earlier roadmap is unchanged: `/` on `.nl` and `.online` still returned 200 from Vercel in this pass.
