# Sourdough Made Sweet Bakehouse

A cottage bakery storefront and private owner workspace. Customers submit requests; the bakery confirms availability, fulfillment and payment separately. No checkout payment or customer accounts.

## Implementation and verification status

Implemented: React landing page, PostgreSQL catalog and variants, configurable cookie flights, persisted cart drafts, validated checkout, server pricing and immutable order snapshots, idempotency, Resend notifications with owner retry, Better Auth owner sessions, category/product/order/settings management and private R2 upload endpoints.

**Not launch-ready yet:** official logo and product photographs were not attached. The wordmark, favicon and labeled photography panels are temporary. Service credentials, verified email domain and real Cloudflare resources are not configured. No production deployment has been performed. Network access prevented downloading several frontend dependencies, so a complete frontend typecheck/build and browser QA could not be completed in this environment. Do not interpret the presence of integration code as proof of production service delivery.

Validated on an isolated PostgreSQL 16 database: migrations, initial seed, owner provisioning/sign-in, unauthenticated API rejection, CSRF rejection, disabled registration, category/product creation/edit/archive, variant changes, order persistence, immutable snapshots, idempotent retry, changed-payload rejection, status updates and email failure/retry persistence. Domain tests cover prices, unavailable products/variants, flights, order input and file restrictions. See `verification.md` for exact results.

## Stack and prerequisites

Node.js 24 LTS, npm, PostgreSQL 16+ and Cloudflare with Pages, Hyperdrive and R2 access. Vite/React/TypeScript, Tailwind, React Router, Lucide, React Hook Form/Zod; Pages Functions route requests through Hono (no separate HTTP server). Drizzle and pg connect to PostgreSQL. Better Auth stores sessions in that same database. Resend uses its HTTPS API.

Direct dependency versions are recorded in package.json. Complete `npm install` on a network-enabled machine and commit the resulting package-lock.json before release. A reproducible install lock could not be generated here because registry requests were refused. On PowerShell with script execution restricted, use `npm.cmd` and `npx.cmd` instead of npm/npx.

## Installation and local development

1. `npm install`
2. Copy `.env.example` to `.env` for CLI tools. Set a local PostgreSQL `DATABASE_URL` and auth settings. Use an isolated database for tests.
3. Copy the runtime settings to `.dev.vars` for Wrangler, excluding `OWNER_PASSWORD`. Set `APP_ENV=development` only locally. Set `BETTER_AUTH_URL=http://localhost:8788` when using the built Pages app.
4. Set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in your shell to the local PostgreSQL URL. This is Wrangler's binding-specific local override. It must be available to the Wrangler process, not merely the Vite browser.
5. Run `npm run db:migrate`, then `npm run db:seed`.
6. Provision the owner as described below.
7. `npm run build`, then `npm run pages:dev`. Open `http://localhost:8788`.
8. For frontend HMR, run `npm run dev` in another terminal. Set local `BETTER_AUTH_URL=http://localhost:5173` and restart Wrangler when browsing via Vite's proxy. Browser mutations require the configured origin to match exactly. The API remains on port 8788.

Node-compatible CLI scripts load `.env` via Node's native loader. The Windows sandbox used during development blocked Node's username lookup in tsx/drizzle-kit; Bun could execute the same tools: `bun scripts/migrate.ts`, `bun scripts/seed.ts`, `bun node_modules/drizzle-kit/bin.cjs generate`. This is a tooling fallback, not a production dependency.

Vite is the public frontend. Wrangler is required for real API behavior. The Vite-only app shows a truthful unavailable-menu state if the backend is offline; it never substitutes a sample catalog.

## PostgreSQL, migrations and seeding

Create a managed PostgreSQL database and a restricted application role. Use TLS for managed database connections. Keep a direct connection URL only in local/CI secrets for migration tooling. Production requests use `HYPERDRIVE.connectionString` exclusively.

`server/db/schema.ts` is the schema source. `npm run db:generate` creates reviewed migrations in drizzle. Commit SQL and snapshot metadata together. `npm run db:migrate` applies pending migrations without resetting the database. Back up production before changing schema. Use a separate test database; never run tests against production.

`npm run db:seed` inserts the required categories, eight bread products (muffins have Mini/Large variants), eight sweet products and one cookie-flight product. It does not overwrite existing names, prices, settings or availability. Coming-soon sweets have no invented price. Catalog prices are integer cents. Archives preserve foreign keys and order snapshots.

The Better Auth tables in the schema match its email/password adapter contract. When changing Better Auth configuration/plugins, use its supported CLI schema workflow: `npx auth@latest generate --config ./scripts/auth-config.ts`, review the generated auth schema against `server/db/schema.ts`, then generate/apply Drizzle migrations. Do not blindly replace application tables. The initial auth schema was validated by actual account creation and session tests; CLI generation itself was not run due to network restrictions.

## Secure owner provisioning

Set `OWNER_EMAIL`, `BETTER_AUTH_URL`, a cryptographically random `BETTER_AUTH_SECRET` of at least 32 characters, and a unique `OWNER_PASSWORD` of at least 14 characters in your local process environment. Run `npm run owner:provision`. Remove OWNER_PASSWORD immediately afterward. Never put it in Cloudflare frontend settings, shell history, Git, URLs or application code. Use a secret manager or secure interactive environment injection.

This command invokes Better Auth's server API with signup enabled only in the one-time script. The deployed auth factory always disables public signup. Existing accounts are not overwritten. Every admin API verifies the database session and exact configured owner email; there is no browser role trust. Cookies are secure in production. Keep `APP_ENV=production` deployed. Changing OWNER_EMAIL revokes administrative authorization for the former email immediately (disable Hyperdrive caching).

Owner password reset by email is not implemented; maintain secure recovery access to the database/tooling and provision a replacement owner deliberately if needed. Never enable public signup as a recovery technique.

## Hyperdrive and Cloudflare Pages

1. Authenticate the Cloudflare CLI with `npx wrangler login` on your deployment machine.
2. Create a Hyperdrive configuration in Cloudflare pointing to managed PostgreSQL. **Disable query caching**; sessions and stock/availability must read current database state.
3. Replace the all-zero Hyperdrive ID in `wrangler.jsonc` with the actual ID; the binding name must remain `HYPERDRIVE`.
4. Create the R2 bucket: `npx wrangler r2 bucket create sourdough-product-images`. Keep its binding name `PRODUCT_IMAGES`.
5. Connect your Git repository in Cloudflare Pages. Framework preset: Vite. Build command: **`npm run build`**. Output directory: **`dist`**. Root directory: repository root. Use Node 24.
6. Set runtime secrets and variables listed below in Pages production and preview environments. Use separate preview database/R2 resources and disable previews from accessing live customer records.
7. Set the public build-time `VITE_TURNSTILE_SITE_KEY` before building. Add the canonical hostname to Turnstile's allowed hostnames.
8. Apply migrations and seed through a direct PostgreSQL URL before deploying. Provision the owner.
9. Push the configured repository to the connected branch. For a manual deployment, run `npm run deploy` after creating/selecting the Pages project.
10. Set `BETTER_AUTH_URL` to the exact HTTPS site origin and test from that origin. Configure custom domain/DNS in Pages. Verify `/api/catalog`, owner sign-in, an order request, owner status changes and R2 upload in the actual deployed runtime.

Pages uses `functions/api/[[path]].ts`. Do not deploy just dist to a generic static host: that would omit the API. No separate Worker API, Express process, D1 or SQLite is used. The compatibility date and `nodejs_compat` are set in wrangler.jsonc. Do not publish while the placeholder Hyperdrive ID remains.

Official references reviewed: [Hyperdrive and PostgreSQL](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/), [local Hyperdrive development](https://developers.cloudflare.com/hyperdrive/configuration/local-development/), [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

## Environment reference

| Name                                                     | Purpose                                             | Secret / exposure                      |
| -------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| DATABASE_URL                                             | Direct PostgreSQL connection for CLI tools          | Secret; never browser                  |
| HYPERDRIVE                                               | Pages database resource binding                     | Server only                            |
| CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE | Local binding override                              | Secret local shell value               |
| PRODUCT_IMAGES                                           | Private R2 bucket binding                           | Server only                            |
| BETTER_AUTH_SECRET                                       | Session/auth cryptographic secret                   | Secret, at least 32 characters         |
| BETTER_AUTH_URL                                          | Canonical origin, no trailing path                  | Server configuration                   |
| OWNER_EMAIL                                              | Sole authorized owner email                         | Server configuration                   |
| OWNER_PASSWORD                                           | One-time provisioning password                      | Tooling-only secret; remove after use  |
| RESEND_API_KEY                                           | Transactional email API key                         | Secret                                 |
| EMAIL_FROM                                               | Verified-domain sender                              | Server configuration                   |
| ORDER_NOTIFICATION_EMAIL                                 | Required destination orders@sourdoughmadesweet.com  | Reserved; server enforces this address |
| TURNSTILE_SECRET_KEY                                     | Bot verification server secret                      | Secret                                 |
| VITE_TURNSTILE_SITE_KEY                                  | Public widget key                                   | Public, compiled into browser          |
| APP_ENV                                                  | production or development                           | Production must use production         |
| TEST_DATABASE_URL                                        | Dedicated migrated/seeded integration test database | Secret tooling-only                    |

Never use a VITE_ prefix for secrets. `.env` and `.dev.vars` are ignored. In production configure bindings in wrangler/Pages and secrets through Pages settings or `wrangler pages secret put NAME --project-name sourdough-made-sweet`. Non-secret business configuration belongs in the owner Settings screen, not environment variables.

## R2 images and branding

Authenticated owner uploads accept JPG/PNG/WebP up to 5 MB, require alt text, validate file magic bytes/content markers and use random object keys. They are served through `/api/media/:id` with MIME headers, nosniff and caching. The bucket has no anonymous upload access. Images referenced by products, including additional photos, cannot be deleted.

Upload authentic photos in Media or the product editor, then select the primary image. Choose one featured product with a strong photo to populate the hero. Use square 1000–1400px product photos and a larger hero crop. Upload optimization/thumbnails and full decoder-based validation remain follow-up improvements: current code validates format signatures/markers and size, but does not perform a complete server-side image decode or generate thumbnails. Additional photographs can be stored/selected but the public card currently shows the primary photo only.

Place the supplied official logo in `public/assets/brand/` and replace temporary wordmarks and favicon with approved variations. No logo was attached to the original task, so none was fabricated. Remove pending photography panels only when genuine assets exist.

## Email setup and reliability

Create a Resend account, add the sending domain and publish the SPF/DKIM DNS records Resend specifies. Wait for verification. Set EMAIL_FROM to an approved sender and RESEND_API_KEY to a restricted key. Ensure `orders@sourdoughmadesweet.com` is a real receiving mailbox. The destination in code alone does not establish delivery.

An order commits before notification is attempted. Email includes all customer/fulfillment details, immutable items, flavors, unit and line prices, subtotal, timestamp, notes and status; both plain text and escaped branded HTML are sent. Provider acceptance sets `notification_status=sent`; this means **accepted by Resend**, not verified inbox delivery. No delivery webhook or customer acknowledgment email is implemented. Failure leaves the saved order visible, with an owner retry action. Pending/stale sending requests can also be retried. A provider idempotency key helps suppress duplicate sends; an explicit retry after failure uses a new attempt key, so an ambiguous network timeout can still result in duplicate notifications. The order itself remains unique.

Customer submission idempotency uses a UUID and a server hash of the validated input (excluding bot token). Same-key/same-input retries return the existing reference. Same-key/different-input requests are rejected. The key is retained during recoverable errors in the same page session; a browser reload begins a new submission attempt. Draft product selections persist locally, but customer contact data does not.

## Security and operating limits

All mutations require a same-origin Origin header. Better Auth additionally protects its own routes. Public requests have bounded JSON, server Zod validation, a honeypot, Turnstile (fails closed in production), and PostgreSQL rate limits based on hashed IPs. Catalog responses can be cached for 30 seconds; sessions/orders/admin responses are no-store. Database queries use Drizzle parameters. CSP permits only the necessary Turnstile domains and same-origin assets.

Order requests are serialized using a PostgreSQL advisory lock to coordinate order pricing with product/flight changes. This is appropriate for a small bakery, not high-volume retail. Owner order listing currently returns the newest 500 requests; search/pagination and retention/export policies are follow-up work. Requests have no stock counts, automatic fulfillment calendar, payment or fee calculation. Do not add sensitive customer data to analytics/logs.

## Tests and acceptance

- `npm test`: domain tests plus integration tests when TEST_DATABASE_URL is set.
- For real persistence tests: migrate/seed a dedicated database, set TEST_DATABASE_URL to it and run npm test. Tests clean their own rows and must never target production.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npm run test:browser`: Playwright shell/error-state/mobile-overflow and login-label checks. Install its Chromium browser first on a network-enabled machine. These checks are not a substitute for a full configured-service checkout test.
- Validate actual R2 upload/delete, verified Resend delivery and Turnstile rejection/acceptance in Pages staging before launch.

## Owner operations

Sign in at `/admin/login`. Categories controls names, slugs, descriptions, themes, sort order and active state. Products controls descriptions, allergens, photos, variants (integer cents), availability, featured state and sort order. Archive preserves order history. Cookie flight configuration appears beneath Products. Orders shows requests and detailed immutable selections; status changes are internal only. Retry bakery notification if needed. Settings controls public contact details, fulfillment methods, ordering guidance and announcement. No secret is editable in Settings.

Confirm the **$5.50 flight price**, required four flavors, muffin pricing, fulfillment offerings, lead-time guidance and public contact information before launch. No pickup address, delivery area/fee, hours, ratings or geographic business claims have been invented.

## Troubleshooting

- Menu unavailable: check database binding/connection, applied migrations and seed. There is deliberately no fallback catalog.
- 403 origin error: BETTER_AUTH_URL must match the exact browser scheme/hostname/port. Restart Wrangler after changes.
- Owner denied: OWNER_EMAIL must match the provisioned session email. Confirm auth secret stability and secure HTTPS cookies in production.
- Order rejected: confirm active category/product/variant, available flight flavors, enabled fulfillment method and Turnstile hostname.
- Email failed: verify sender domain, API key and mailbox; the order remains in the dashboard.
- Image delete rejected: remove all primary/additional references, including archived products, first.
- Production build missing modules: finish npm install with network access. Do not replace missing libraries with fake shims.
- Migration failure: inspect the real error, database permissions and backups. Never reset production automatically.
