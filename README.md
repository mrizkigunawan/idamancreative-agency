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

Requirements: Node.js 20 or newer and pnpm 10 or newer.

Content analysis uses the Cloudflare Workers AI binding configured in `wrangler.jsonc`. A Cloudflare account with Workers AI enabled is required when running an analysis, and model calls may incur usage charges even during local development. Before each request, the app asks for confirmation to send the selected brand profile, page title/description, and any caption/transcript/context to Cloudflare Workers AI. Public pages may block metadata access; in that case, paste the caption or transcript. The feature does not retrieve video analytics or watch the full video, so it labels performance drivers as hypotheses rather than proven causes of virality.

1. Install packages:

   ```sh
   pnpm install
   ```

2. Create local secrets in `.dev.vars` (this file is ignored by Git). Generate both keys with `openssl rand -hex 32` and use different values:

   ```dotenv
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=replace-with-a-random-64-character-hex-secret
   ADMIN_EMAIL=you@example.com
   ADMIN_BOOTSTRAP_TOKEN=replace-with-a-different-random-64-character-hex-token
   ```

3. Apply the D1 migrations and start the app:

   ```sh
   pnpm db:local
   pnpm dev
   ```

4. Open `http://localhost:3000`, choose **Setup admin pertama kali**, enter the exact `ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_TOKEN`, and choose a unique password with at least 8 characters. The database enforces a single account, and registration is denied after it is created.

Use the exact origin configured in `BETTER_AUTH_URL`, including the protocol, hostname, and port. `http://localhost:3000` and `http://127.0.0.1:3000` are different origins; opening one while configuring the other causes Better Auth to reject signup with `Invalid origin`. Restart `pnpm dev` after changing `.dev.vars`. `Using secrets defined in .dev.vars` is an informational message, not an error.

Keep `ADMIN_BOOTSTRAP_TOKEN` until the admin account is created. After setup, remove it from `.dev.vars` and the Cloudflare Worker secrets. If the first setup token is lost before an admin is created, set a new one. Do not put passwords or tokens in source control.

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

3. Set Worker secrets. Use separate random values for the auth secret and one-time bootstrap token:

   ```sh
   pnpm exec wrangler secret put BETTER_AUTH_SECRET
   pnpm exec wrangler secret put ADMIN_EMAIL
   pnpm exec wrangler secret put ADMIN_BOOTSTRAP_TOKEN
   pnpm exec wrangler secret put BETTER_AUTH_URL
   ```

   Set `BETTER_AUTH_URL` to the exact deployed `https://…` origin. Keep the setup token until the first admin account is created, then remove it with `pnpm exec wrangler secret delete ADMIN_BOOTSTRAP_TOKEN`.

4. Build and deploy:

   ```sh
   pnpm deploy
   ```

5. Open the deployment URL and complete the one-time admin setup. Use a unique password of at least 8 characters; the setup form never supplies or stores a default password. Store it in a password manager.

To regenerate Workers binding types after changing `wrangler.jsonc`, run `pnpm cf-typegen`.

## Data and migrations

- `src/lib/schema.ts` defines the application tables with Drizzle.
- `migrations/0001_initial.sql` creates the Better Auth tables, persistent login rate-limit table, and app tables. It also adds a database trigger that guarantees only one admin account can exist.
- Use Wrangler's D1 migration commands above for local or remote databases. `drizzle.config.ts` is provided for Drizzle Kit schema generation and D1 HTTP access.
- The prototype data is kept in `src/lib/demo-data.json`; the dashboard can import it only when all application tables are empty.

## Stack

TanStack Start + React · Cloudflare Workers + D1 · Drizzle ORM · Better Auth · React Hook Form + Zod · Radix Dialog · Recharts · date-fns · Lucide.
