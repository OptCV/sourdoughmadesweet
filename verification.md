# Verification record

## Customization update — November 8, 2026

- Full TypeScript check, Vite production build, ESLint and diff whitespace checks passed.
- 25 Vitest tests passed, including real PostgreSQL persistence of appearance/category settings, rejection of nonexistent image references, and protection of background images from deletion.
- Four Playwright tests passed using installed Microsoft Edge (`PLAYWRIGHT_CHANNEL=msedge`): owner settings editing/saving, saved storefront colors/copy, responsive overflow/navigation, and login labels. Browser API fixtures verify UI behavior; PostgreSQL tests independently verify real persistence.
- Additive migration `0002_workable_hannibal_king.sql` applied successfully to the isolated test database. Apply it to the application database before deployment; no reseed is necessary.
- Fixed tablet overflow from the decorative hero seal. Tested storefront widths from 360px through 1440px.
- No production deployment or live Cloudflare/R2/Resend verification was performed in this update.

The initial implementation record below is historical; its dependency/build/browser blockers have been superseded by the checks above.

## Passed in the development environment

- Pages Functions bundle compiled successfully with Wrangler and nodejs_compat.
- Backend/shared/scripts TypeScript check passed using tsconfig.server.json.

- Drizzle migration generation (Bun execution used due Windows sandbox Node user lookup limitation).
- Migration application to a new isolated PostgreSQL 16.15 database.
- Insert-only seed populated the initial catalog.
- Vitest: 19 tests passed, including three real PostgreSQL integration workflows.
- Real Better Auth account creation, password sign-in and database session authorization.
- Unauthorized admin access, cross-origin mutation and public registration rejection.
- Category/product CRUD and variant editing, followed by safe archival.
- Order persistence, immutable snapshot totals, same-payload retry deduplication, changed-payload rejection.
- Email failure persisted without losing the order; owner status and notification retry routes executed.
- Sixteen domain cases cover variants, unavailable products, flight selection, request validation, email escaping and upload rejection.

## Not verified / blocked

- Full dependency installation: registry connections refused by the environment. Existing cached packages were copied into ignored node_modules for backend validation; this does not replace a clean installation or lockfile.
- Full TypeScript/build/browser checks: missing lucide-react, react-hook-form, @hookform/resolvers and Fontsource packages. Backend type errors found during partial checking were corrected. No successful complete production build is claimed.
- Better Auth CLI schema generation (auth tables were instead exercised against the real adapter).
- Actual Cloudflare Pages deployment, Hyperdrive production connectivity, real R2 object operations, Turnstile production verification and Resend inbox delivery.
- Official logo, authentic product photography and owner confirmation of business settings/prices.

See README for configuration, exact deployment commands and remaining limitations. Complete all blocked checks before launch.
