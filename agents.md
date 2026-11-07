# Sourdough Made Sweet: engineering guide

## Project and workflow

This cottage bakery accepts requests, not paid or guaranteed orders. Customers browse a database catalog, select variants and flights, submit contact/fulfillment preferences and receive a saved request reference. Only the provisioned owner manages categories, products, media, settings and requests at /admin. Status changes do not send customer emails.

## Architecture and boundaries

Vite, React, TypeScript, Tailwind, React Router, Lucide, React Hook Form and Zod power the browser. Cloudflare Pages file routing delegates /api/* to server/api.ts. All prices, authorization, database access, R2 writes and email delivery execute there. PostgreSQL via Hyperdrive and pg is mandatory; Drizzle owns schema/migrations. Better Auth uses the Drizzle adapter and database sessions. Never import server modules in src. Shared contracts live in shared. Never substitute mock catalog/order responses or local storage persistence for server persistence. Cart storage is only an unfinished draft.

## Repository

- src/components: public catalog, checkout and admin interfaces
- src/pages: landing and owner routes
- src/hooks: browser hooks when shared behavior warrants extraction
- src/lib: browser API client
- src/styles: design tokens and responsive styling
- shared: DTOs and reusable Zod input contracts
- functions/api/[[path]].ts: Pages catch-all API Function
- server/auth: Better Auth factory
- server/db: schema, connection and catalog
- server/email: escaped HTML/plain-text notification
- server/storage: upload validation
- server/validation: authoritative pricing
- drizzle: generated reviewed migrations
- scripts: migrate, seed and provision owner
- tests: domain and backend tests
- public/assets/brand: supplied logo placement; none was attached initially

## Actual commands

Install: npm install. Develop browser: npm run dev (proxy to Wrangler port 8788). Build first and run npm run pages:dev for the real Pages runtime. npm run typecheck, npm run lint, npm test, npm run test:browser, npm run build validate. npm run db:generate creates migrations; review SQL before npm run db:migrate. npm run db:seed inserts the initial catalog without overwriting edits. npm run owner:provision creates the owner using environment-only password input. npm run deploy builds and deploys Pages after account/binding setup. See README for required configuration.

## Coding standards

Use strict TypeScript, meaningful names, small components, typed contracts and explicit errors. Avoid any. Centralize Zod schemas and server price rules. Never duplicate authoritative pricing in browser code. Browser totals are estimates. Format consistently. Do not log customer payloads, secrets or credentials. Error messages must not expose internal SQL or stack traces.

## Authentication and security

Every admin request requires a Better Auth database session AND a matching OWNER_EMAIL. Public registration is disabled. Never trust browser roles, hide-only route guards, default credentials or unprotected endpoints. Mutations require a same-origin Origin header; Better Auth also performs its own origin checks. Production uses HTTPS secure cookies. Provisioning runs only in local tooling with a strong password supplied in environment, not as a public bootstrap route. Bound all payloads, quantities and uploads. Turnstile fails closed in production. Use database rate limits, including sign-in limits. No private endpoint caching.

## Database rules

Use snake_case SQL columns and typed camelCase code fields. Prices are integer cents. Use unique slugs, FKs and indexes. Archive products/categories, never erase order history. Orders hold immutable item/configuration snapshots. Seed is insert-only and must never reset production. Schema changes must be additive or accompanied by reviewed backfills. Migrations use a direct DATABASE_URL; requests use HYPERDRIVE. Disable Hyperdrive query caching to prevent stale authorization/availability reads.

## UI rules

Read design.md before frontend changes. Exact cream/chocolate/gold palette, Cormorant Garamond and DM Sans, generous spacing, semantic headings, labeled controls and visible keyboard focus. All breakpoints must work down to 360px. Never fabricate official logos or bakery product photos. Temporary image areas must say photography is pending.

## Testing

Test price variants, inactive/sold-out products, exact eligible flight count, duplicate flavor rejection, quantity limits, empty orders, escaped emails, file signatures and size limits. Integration coverage must exercise authenticated CRUD, session rejection, transactional order persistence, idempotency and notification failures against PostgreSQL. Browser coverage checks responsive overflow, navigation, labels and failure states. Test R2 and Resend against configured services before claiming deployment readiness; mocks alone are not evidence of delivery.

## Environment

DATABASE_URL: secret direct PostgreSQL tooling URL. HYPERDRIVE: runtime database binding. PRODUCT_IMAGES: private R2 binding. BETTER_AUTH_SECRET: secret >=32 characters. BETTER_AUTH_URL: canonical origin. OWNER_EMAIL: authorized owner email. RESEND_API_KEY: secret. EMAIL_FROM: verified sender. ORDER_NOTIFICATION_EMAIL: orders@sourdoughmadesweet.com. TURNSTILE_SECRET_KEY: secret. VITE_TURNSTILE_SITE_KEY: public build-time site key. APP_ENV: development or production; only development permits missing Turnstile. OWNER_PASSWORD: tooling-only temporary secret. CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: local Wrangler connection. Never prefix private values with VITE_. See .env.example and README.

## Agent workflow

1. Read agents.md and design.md.
2. Inspect relevant code.
3. Plan significant changes.
4. Preserve the required architecture.
5. Implement complete behavior, not placeholders for services.
6. Update meaningful tests for changed behavior.
7. Run relevant checks.
8. State unresolved limitations.
9. Keep docs aligned with code. Never claim integrations work without validation.

Windows treats agents.md and AGENTS.md as the same filename; this file is the instruction source for both spellings.
