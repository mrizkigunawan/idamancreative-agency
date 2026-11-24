# Agency Workspace

A private operations workspace built with TanStack Start, Cloudflare Workers, D1, Drizzle ORM, and Better Auth.

## Features

- Admin-only sign in with a one-time account setup flow; public registration is blocked after the first account.
- Persistent D1 data for clients, SOW targets, content plans and briefs, production visits, pitching prospects, and income/expense transactions.
- Monthly dashboard, cash flow chart, content calendar, per-brand workspace, performance summary, and print-friendly monthly report.
- Content reference analysis for public Instagram, TikTok, and YouTube links, with a one-click prefilled content plan.
- Zod-validated forms using React Hook Form. Better Auth stores sessions and persistent rate limits in D1.
- Optional prototype sample data import for an empty workspace.

## Workspace identity

Use **Edit profil** in the account dropdown to set the workspace name, logo, and optional document signer's name. The saved identity is used on login, navigation, page titles, shared content plans, monthly reports, and generated PDFs. Before a name is configured, the app uses the neutral **Agency Workspace** identity and a generic logo.

Document templates store `{{workspaceName}}` rather than an agency name. PDF generation resolves that marker using the latest saved profile. Custom text stays as written; clients' brand names remain separate. Existing document numbers and saved payment destinations are preserved. New invoices require an explicitly selected or entered payment destination.

Migrations `0030` and `0031` update generic defaults and convert exact, unedited legacy template introductions to the marker. Apply migrations with `pnpm db:local` for local development and `pnpm db:remote` when deploying. Infrastructure resource identifiers in Wrangler, package scripts, and historical migrations retain their existing names so they continue to address the existing installation.

Run `pnpm test:branding` with Node 24 and Python 3 to check profile isolation, templates, PDF identity, and migration data preservation. The installation supports one admin and one workspace profile per D1 database; this change does not add SaaS tenancy.

## Appearance

Open **Edit profil → Tampilan workspace** to choose blue, teal, violet, or graphite accents and light, dark, or system mode. Choices preview immediately; **Simpan semua perubahan** persists them for the workspace. Leaving the profile page without saving restores the saved appearance. System mode follows each viewer's device preference.

Migration `0032` adds the appearance settings, defaulting to blue and light mode. Login and public review pages use the saved theme too. Client colors and semantic status colors stay distinct, and printed reports use light surfaces.

Shared type scales, controls, spacing, and visual foundations live in `src/styles/system.css`. Existing component layouts are in the lower `components` layer of `src/styles.css`; paper-specific styles are isolated in `src/styles/print.css`. Preset palettes and theme validation live in `src/lib/workspace-theme.ts`. The branding test command also checks theme contrast, safe defaults, and token coverage.

## Local development

Use Node.js 24 and the project's pinned pnpm `12.23.0` (via Corepack). `packageManager` in `package.json` pins the same pnpm version for local work and Cloudflare Workers Builds.

The lockfile includes pnpm 12's separate bootstrap document. Older pnpm versions report `ERR_PNPM_BROKEN_LOCKFILE` with “expected a single document” when reading it. Keep the lockfile intact and use the pinned version; confirm it with `pnpm --version`. If Cloudflare still selects an older version, check that it is building the commit and root directory containing this `package.json`. See [Cloudflare's package-manager version selection](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/#pnpm-version-selection).

Content analysis uses the Cloudflare Workers AI binding configured in `wrangler.jsonc`. A Cloudflare account with Workers AI enabled is required when running an analysis, and model calls may incur usage charges even during local development. Before each request, the app asks for confirmation to send the selected brand profile, page title/description, and any caption/transcript/context to Cloudflare Workers AI. Public pages may block metadata access; in that case, paste the caption or transcript. The feature does not retrieve video analytics or watch the full video, so it labels performance drivers as hypotheses rather than proven causes of virality.

1. Install packages:

   ```sh
   pnpm install
   ```

2. Create local secrets in `.dev.vars` (this file is ignored by Git). Generate the auth secret with `openssl rand -hex 32`:

   ```dotenv
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=replace-with-a-random-64-character-hex-secret
   ADMIN_EMAIL=you@example.com
   ```

3. Apply the D1 migrations and start the app:

   ```sh
   pnpm db:local
   pnpm dev
   ```

4. In another terminal, generate the owner’s activation link:

   ```sh
   pnpm setup:link --local
   ```

   This reads `ADMIN_EMAIL` and `BETTER_AUTH_URL` from `.dev.vars`. Open the printed link, enter your name and a unique password (at least 8 characters), and click **Aktifkan workspace**. The approved email is already filled in. Activation signs you in automatically.

Use the exact origin configured in `BETTER_AUTH_URL`, including the protocol, hostname, and port. `http://localhost:3000` and `http://127.0.0.1:3000` are different origins; opening one while configuring the other causes Better Auth to reject signup with `Invalid origin`. Restart `pnpm dev` after changing `.dev.vars`. `Using secrets defined in .dev.vars` is an informational message, not an error.

Activation links expire 30 minutes after generation. Run the same command again to replace a lost or expired link; every replacement invalidates the previous one. Opening a link does not consume it. Registration closes when the account and password credential are successfully created. Existing installations keep their account and normal login.

`ADMIN_BOOTSTRAP_TOKEN` is no longer used. Remove that old variable from `.dev.vars` and Worker secrets when convenient. Do not put passwords or activation links in source control.

## Cloudflare deployment

1. Create the production D1 database:

   ```sh
   pnpm exec wrangler d1 create idaman-creative-ops
   ```

   Copy its ID into `wrangler.jsonc` as `database_id`.

2. Apply the schema:

   ```sh
   pnpm db:remote
   ```

3. Set Worker secrets. Use a long, random value for the auth secret:

   ```sh
   pnpm exec wrangler secret put BETTER_AUTH_SECRET
   pnpm exec wrangler secret put ADMIN_EMAIL
   pnpm exec wrangler secret put BETTER_AUTH_URL
   ```

   Set `BETTER_AUTH_URL` to the exact deployed `https://…` origin and `ADMIN_EMAIL` to the approved owner’s email.

4. Build and deploy:

   ```sh
   pnpm deploy
   ```

5. After deployment, generate a one-time activation link:

   ```sh
   pnpm setup:link --remote --email owner@example.com --origin https://your-workspace.example
   ```

   The command uses `wrangler.production.jsonc` and requires the installer’s Cloudflare access. Email/origin must match the Worker’s `ADMIN_EMAIL`/`BETTER_AUTH_URL`. Share the link privately with the owner, who only needs to enter a name and password. Automatic email delivery is not configured.

To regenerate Workers binding types after changing `wrangler.jsonc`, run `pnpm cf-typegen`.

## Admin activation security and maintenance

Migration `0033_admin_activation.sql` adds a single installation grant containing only a SHA-256 token digest and an expiry. It marks existing installations as already activated. The token travels in a URL fragment, so it is not sent in page URLs or referrers. The browser removes that fragment and exchanges it for a short-lived HttpOnly, SameSite=Strict cookie (Secure on HTTPS), allowing the form to survive a refresh. Only a valid link reveals the approved email.

The activation endpoint runs inside Better Auth with its origin checks and persistent rate limits. It hashes the password using Better Auth, then atomically writes the user, credential, and consumed grant in a D1 batch. It rechecks the token, configured email, expiry, and absence of another admin inside that write. A failed database write preserves the link. Automatic sign-in uses Better Auth’s session/cookie handling; if session creation fails, the completed account can still sign in normally.

Public email signup and the old bootstrap header are disabled. The database still enforces one admin, and a completion marker prevents issuing another activation link even after the account is removed. Activation is not an account recovery mechanism and does not prove mailbox ownership; an installer privately authorizes the configured email. Password recovery/email delivery remain separate work.

Use `pnpm setup:link --help` for a custom Wrangler config or local state directory. The command prints a link only after the selected database accepts its digest. Never run it against production for testing. Run `pnpm test:activation` with Node 24 to check expiry, replacement, replay, concurrency, rollback, password compatibility, and existing-account preservation.

## Data and migrations

- `src/lib/schema.ts` defines the application tables with Drizzle.
- `migrations/0001_initial.sql` creates the Better Auth tables, persistent login rate-limit table, and app tables. It also adds a database trigger that guarantees only one admin account can exist.
- Use Wrangler's D1 migration commands above for local or remote databases. `drizzle.config.ts` is provided for Drizzle Kit schema generation and D1 HTTP access.
- The prototype data is kept in `src/lib/demo-data.json`; the dashboard can import it only when all application tables are empty.

## Stack

TanStack Start + React · Cloudflare Workers + D1 · Drizzle ORM · Better Auth · React Hook Form + Zod · Radix Dialog · Recharts · date-fns · Lucide.
